import type { AgentTask, AgentResult } from '../types/agent.js';
import type { EmailContext } from '../types/email.js';
import type { IAgent, IAgentFactory } from '../interfaces/IAgent.js';
import type { IAgentOrchestrator } from '../interfaces/IAgentOrchestrator.js';
export declare class AgentOrchestrator implements IAgentOrchestrator {
    private agentFactory;
    private logger;
    private agents;
    private agentsByType;
    private taskQueue;
    private activeExecutions;
    constructor(agentFactory: IAgentFactory);
    registerAgent(agent: IAgent): Promise<void>;
    unregisterAgent(agentId: string): Promise<void>;
    getAgent(agentId: string): Promise<IAgent | null>;
    listAgents(): Promise<IAgent[]>;
    executeAgent(agentType: string, task: AgentTask, context: EmailContext): Promise<AgentResult>;
    executeAgentById(agentId: string, task: AgentTask, context: EmailContext): Promise<AgentResult>;
    getMetrics(): Promise<{
        totalAgents: number;
        activeAgents: number;
        totalTasksExecuted: number;
        averageExecutionTime: number;
    }>;
    shutdown(): Promise<void>;
    private selectAgent;
    private getAgentType;
}
//# sourceMappingURL=AgentOrchestrator.d.ts.map