import type { AgentConfiguration, AgentStatus, AgentTask, AgentResult, AgentExecutionContext, AgentMetrics } from '../types/agent.js';
import type { EmailContext } from '../types/email.js';
export interface IAgent {
    readonly id: string;
    readonly name: string;
    readonly configuration: AgentConfiguration;
    readonly status: AgentStatus;
    readonly metrics: AgentMetrics;
    /**
     * Initialize the agent with configuration
     */
    initialize(config: AgentConfiguration): Promise<void>;
    /**
     * Check if the agent can handle a specific task
     */
    canHandle(task: AgentTask): boolean;
    /**
     * Execute a task with the given context
     */
    execute<TInput, TOutput>(task: AgentTask<TInput, TOutput>, context: EmailContext, executionContext: AgentExecutionContext): Promise<AgentResult<TOutput>>;
    /**
     * Validate the task input before execution
     */
    validateInput<T>(input: T): Promise<boolean>;
    /**
     * Get agent health status
     */
    getHealthStatus(): Promise<{
        healthy: boolean;
        issues: string[];
        lastCheck: Date;
    }>;
    /**
     * Update agent configuration
     */
    updateConfiguration(config: Partial<AgentConfiguration>): Promise<void>;
    /**
     * Gracefully shutdown the agent
     */
    shutdown(): Promise<void>;
}
export interface IAgentFactory {
    /**
     * Create an agent instance of the specified type
     */
    createAgent(type: string, config: AgentConfiguration): Promise<IAgent>;
    /**
     * Get available agent types
     */
    getAvailableTypes(): string[];
    /**
     * Register a new agent type
     */
    registerAgentType(type: string, constructor: new () => IAgent): void;
}
//# sourceMappingURL=IAgent.d.ts.map