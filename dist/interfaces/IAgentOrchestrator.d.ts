import type { AgentTask, AgentResult } from '../types/agent.js';
import type { EmailContext } from '../types/email.js';
import type { IAgent } from './IAgent.js';
export interface IAgentOrchestrator {
    /**
     * Register an agent with the orchestrator
     */
    registerAgent(agent: IAgent): Promise<void>;
    /**
     * Unregister an agent
     */
    unregisterAgent(agentId: string): Promise<void>;
    /**
     * Get an agent by ID
     */
    getAgent(agentId: string): Promise<IAgent | null>;
    /**
     * List all registered agents
     */
    listAgents(): Promise<IAgent[]>;
    /**
     * Execute a task using the most suitable agent
     */
    executeAgent(agentType: string, task: AgentTask, context: EmailContext): Promise<AgentResult>;
    /**
     * Execute a task with specific agent
     */
    executeAgentById(agentId: string, task: AgentTask, context: EmailContext): Promise<AgentResult>;
    /**
     * Get orchestrator metrics
     */
    getMetrics(): Promise<{
        totalAgents: number;
        activeAgents: number;
        totalTasksExecuted: number;
        averageExecutionTime: number;
    }>;
    /**
     * Shutdown all agents
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=IAgentOrchestrator.d.ts.map