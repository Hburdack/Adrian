var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { injectable, inject } from 'inversify';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../monitoring/Logger.js';
import { TYPES } from '../types/container.js';
let AgentOrchestrator = class AgentOrchestrator {
    agentFactory;
    logger;
    agents = new Map();
    agentsByType = new Map();
    taskQueue = [];
    activeExecutions = new Map();
    constructor(agentFactory) {
        this.agentFactory = agentFactory;
        this.logger = new Logger('AgentOrchestrator');
    }
    async registerAgent(agent) {
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
        this.agentsByType.get(agentType).push(agent);
        this.logger.info('Agent registered successfully', { agentId: agent.id });
    }
    async unregisterAgent(agentId) {
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
    async getAgent(agentId) {
        return this.agents.get(agentId) || null;
    }
    async listAgents() {
        return Array.from(this.agents.values());
    }
    async executeAgent(agentType, task, context) {
        const agent = await this.selectAgent(agentType, task);
        if (!agent) {
            throw new Error(`No suitable agent found for type: ${agentType}`);
        }
        return this.executeAgentById(agent.id, task, context);
    }
    async executeAgentById(agentId, task, context) {
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
        const executionContext = {
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
        }
        catch (error) {
            this.logger.error('Task execution failed', {
                taskId: task.id,
                agentId: agent.id,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
        finally {
            this.activeExecutions.delete(executionId);
        }
    }
    async getMetrics() {
        const agents = Array.from(this.agents.values());
        const activeAgents = agents.filter(agent => agent.status === AgentStatus.BUSY).length;
        const totalTasksExecuted = agents.reduce((sum, agent) => sum + agent.metrics.totalProcessed, 0);
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
    async shutdown() {
        this.logger.info('Shutting down agent orchestrator');
        const shutdownPromises = Array.from(this.agents.values()).map(agent => agent.shutdown().catch(error => {
            this.logger.error('Error shutting down agent', {
                agentId: agent.id,
                error: error instanceof Error ? error.message : String(error)
            });
        }));
        await Promise.all(shutdownPromises);
        this.agents.clear();
        this.agentsByType.clear();
        this.activeExecutions.clear();
        this.logger.info('Agent orchestrator shutdown complete');
    }
    async selectAgent(agentType, task) {
        const candidateAgents = this.agentsByType.get(agentType) || [];
        if (candidateAgents.length === 0) {
            return null;
        }
        // Filter agents that can handle the task and are available
        const availableAgents = candidateAgents.filter(agent => {
            if (!agent.canHandle(task))
                return false;
            if (agent.status === AgentStatus.DISABLED || agent.status === AgentStatus.ERROR)
                return false;
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
    getAgentType(agent) {
        // Extract agent type from agent name or configuration
        // This is a simplified implementation
        return agent.name.toLowerCase().replace(/agent$/, '');
    }
};
AgentOrchestrator = __decorate([
    injectable(),
    __param(0, inject(TYPES.AgentFactory)),
    __metadata("design:paramtypes", [Object])
], AgentOrchestrator);
export { AgentOrchestrator };
//# sourceMappingURL=AgentOrchestrator.js.map