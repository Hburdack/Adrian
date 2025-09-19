import type { AgentConfiguration, AgentStatus, AgentTask, AgentResult, AgentExecutionContext, AgentMetrics } from '../types/agent.js';
import type { EmailContext } from '../types/email.js';
import type { IAgent } from '../interfaces/IAgent.js';
import { Logger } from '../monitoring/Logger.js';
export declare abstract class BaseAgent implements IAgent {
    protected logger: Logger;
    protected _configuration: AgentConfiguration;
    protected _status: AgentStatus;
    protected _metrics: AgentMetrics;
    constructor();
    get id(): string;
    get name(): string;
    get configuration(): AgentConfiguration;
    get status(): AgentStatus;
    get metrics(): AgentMetrics;
    initialize(config: AgentConfiguration): Promise<void>;
    abstract canHandle(task: AgentTask): boolean;
    execute<TInput, TOutput>(task: AgentTask<TInput, TOutput>, context: EmailContext, executionContext: AgentExecutionContext): Promise<AgentResult<TOutput>>;
    validateInput<T>(input: T): Promise<boolean>;
    getHealthStatus(): Promise<{
        healthy: boolean;
        issues: string[];
        lastCheck: Date;
    }>;
    updateConfiguration(config: Partial<AgentConfiguration>): Promise<void>;
    shutdown(): Promise<void>;
    protected abstract executeTask<TInput, TOutput>(task: AgentTask<TInput, TOutput>, context: EmailContext, executionContext: AgentExecutionContext): Promise<AgentResult<TOutput>>;
    protected onInitialize(): Promise<void>;
    protected onConfigurationUpdate(config: Partial<AgentConfiguration>): Promise<void>;
    protected onShutdown(): Promise<void>;
    private updateMetrics;
}
//# sourceMappingURL=BaseAgent.d.ts.map