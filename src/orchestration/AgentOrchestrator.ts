import { injectable, inject } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import type {
  AgentTask,
  AgentResult,
  AgentExecutionContext,
  AgentStatus
} from '../types/agent.js';
import type { EmailContext } from '../types/email.js';
import type { IAgent, IAgentFactory } from '../interfaces/IAgent.js';
import type { IAgentOrchestrator } from '../interfaces/IAgentOrchestrator.js';
import { Logger } from '../monitoring/Logger.js';
import { TYPES } from '../types/container.js';

@injectable()
export class AgentOrchestrator implements IAgentOrchestrator {
  private logger: Logger;
  private agents = new Map<string, IAgent>();
  private agentsByType = new Map<string, IAgent[]>();
  private activeExecutions = new Map<string, AgentExecutionContext>();

  constructor(
    @inject(TYPES.AgentFactory) private _agentFactory: IAgentFactory
  ) {
    this.logger = new Logger('AgentOrchestrator');
  }

  async registerAgent(agent: IAgent): Promise<void> {
    this.logger.info('Registering agent', {
      agentId: agent.id,
      name: agent.name,
      capabilities: agent.configuration.capabilities.map(c => c.name)
    });

    this.agents.set(agent.id, agent);

    // Group agents by type for efficient lookup
    const agentType = this.getAgentType(agent);
    if (!this.agentsByType.has(agentType)) {
      this.agentsByType.set(agentType, []);
    }
    this.agentsByType.get(agentType)!.push(agent);

    this.logger.info('Agent registered successfully', { agentId: agent.id });
  }

  async unregisterAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    this.logger.info('Unregistering agent', { agentId });

    // Remove from agents map
    this.agents.delete(agentId);

    // Remove from type-based grouping
    const agentType = this.getAgentType(agent);
    const typeAgents = this.agentsByType.get(agentType);
    if (typeAgents) {
      const index = typeAgents.findIndex(a => a.id === agentId);
      if (index !== -1) {
        typeAgents.splice(index, 1);
      }
      if (typeAgents.length === 0) {
        this.agentsByType.delete(agentType);
      }
    }

    // Shutdown the agent
    await agent.shutdown();

    this.logger.info('Agent unregistered successfully', { agentId });
  }

  async getAgent(agentId: string): Promise<IAgent | null> {
    return this.agents.get(agentId) || null;
  }

  async listAgents(): Promise<IAgent[]> {
    return Array.from(this.agents.values());
  }

  async executeAgent(
    agentType: string,
    task: AgentTask,
    context: EmailContext
  ): Promise<AgentResult> {
    const agent = await this.selectAgent(agentType, task);
    if (!agent) {
      throw new Error(`No suitable agent found for type: ${agentType}`);
    }

    return this.executeAgentById(agent.id, task, context);
  }

  async executeAgentById(
    agentId: string,
    task: AgentTask,
    context: EmailContext
  ): Promise<AgentResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }

    if (agent.status !== AgentStatus.IDLE) {
      // Check if agent can handle concurrent tasks
      const maxConcurrent = agent.configuration.maxConcurrentTasks;
      const currentTasks = Array.from(this.activeExecutions.values())
        .filter(exec => exec.agentId === agentId).length;

      if (currentTasks >= maxConcurrent) {
        throw new Error(`Agent ${agentId} is at maximum concurrent task capacity`);
      }
    }

    if (!agent.canHandle(task)) {
      throw new Error(`Agent ${agentId} cannot handle task of type: ${task.type}`);
    }

    const executionId = uuidv4();
    const executionContext: AgentExecutionContext = {
      taskId: task.id,
      agentId: agent.id,
      startTime: new Date(),
      timeout: task.timeout || agent.configuration.timeout,
      metadata: {
        orchestratorExecutionId: executionId,
        ...task.metadata
      }
    };

    this.activeExecutions.set(executionId, executionContext);

    this.logger.info('Executing task', {
      taskId: task.id,
      agentId: agent.id,
      executionId
    });

    try {
      const result = await agent.execute(task, context, executionContext);

      this.logger.info('Task execution completed', {
        taskId: task.id,
        agentId: agent.id,
        success: result.success,
        confidence: result.confidence
      });

      return result;

    } catch (error) {
      this.logger.error('Task execution failed', {
        taskId: task.id,
        agentId: agent.id,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;

    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  async getMetrics(): Promise<{
    totalAgents: number;
    activeAgents: number;
    totalTasksExecuted: number;
    averageExecutionTime: number;
  }> {
    const agents = Array.from(this.agents.values());
    const activeAgents = agents.filter(agent => agent.status === AgentStatus.BUSY).length;

    const totalTasksExecuted = agents.reduce(
      (sum, agent) => sum + agent.metrics.totalProcessed,
      0
    );

    const averageExecutionTime = agents.length > 0
      ? agents.reduce((sum, agent) => sum + agent.metrics.averageProcessingTime, 0) / agents.length
      : 0;

    return {
      totalAgents: agents.length,
      activeAgents,
      totalTasksExecuted,
      averageExecutionTime
    };
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down agent orchestrator');

    const shutdownPromises = Array.from(this.agents.values()).map(agent =>
      agent.shutdown().catch(error => {
        this.logger.error('Error shutting down agent', {
          agentId: agent.id,
          error: error instanceof Error ? error.message : String(error)
        });
      })
    );

    await Promise.all(shutdownPromises);

    this.agents.clear();
    this.agentsByType.clear();
    this.activeExecutions.clear();

    this.logger.info('Agent orchestrator shutdown complete');
  }

  private async selectAgent(agentType: string, task: AgentTask): Promise<IAgent | null> {
    const candidateAgents = this.agentsByType.get(agentType) || [];

    if (candidateAgents.length === 0) {
      return null;
    }

    // Filter agents that can handle the task and are available
    const availableAgents = candidateAgents.filter(agent => {
      if (!agent.canHandle(task)) return false;
      if (agent.status === AgentStatus.DISABLED || agent.status === AgentStatus.ERROR) return false;

      // Check concurrent task capacity
      const maxConcurrent = agent.configuration.maxConcurrentTasks;
      const currentTasks = Array.from(this.activeExecutions.values())
        .filter(exec => exec.agentId === agent.id).length;

      return currentTasks < maxConcurrent;
    });

    if (availableAgents.length === 0) {
      return null;
    }

    // Select agent with highest priority and best metrics
    return availableAgents.reduce((best, current) => {
      // Priority first
      if (current.configuration.priority > best.configuration.priority) {
        return current;
      }
      if (current.configuration.priority < best.configuration.priority) {
        return best;
      }

      // Then by success rate
      if (current.metrics.successRate > best.metrics.successRate) {
        return current;
      }
      if (current.metrics.successRate < best.metrics.successRate) {
        return best;
      }

      // Finally by processing time (lower is better)
      return current.metrics.averageProcessingTime < best.metrics.averageProcessingTime
        ? current
        : best;
    });
  }

  private getAgentType(agent: IAgent): string {
    // Extract agent type from agent name or configuration
    // This is a simplified implementation
    return agent.name.toLowerCase().replace(/agent$/, '');
  }
}