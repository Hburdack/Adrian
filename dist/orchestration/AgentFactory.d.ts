import type { AgentConfiguration } from '../types/agent.js';
import type { IAgent, IAgentFactory } from '../interfaces/IAgent.js';
export declare class AgentFactory implements IAgentFactory {
    private logger;
    private agentConstructors;
    constructor();
    createAgent(type: string, config: AgentConfiguration): Promise<IAgent>;
    getAvailableTypes(): string[];
    registerAgentType(type: string, constructor: new () => IAgent): void;
    private registerDefaultAgentTypes;
}
export declare class MockAgent implements IAgent {
    private _configuration;
    private _status;
    private _metrics;
    get id(): string;
    get name(): string;
    get configuration(): AgentConfiguration;
    get status(): AgentStatus;
    get metrics(): {
        totalProcessed: number;
        successRate: number;
        averageProcessingTime: number;
        lastActivity: Date;
        errorCount: number;
    };
    initialize(config: AgentConfiguration): Promise<void>;
    canHandle(task: any): boolean;
    execute(task: any, context: any, executionContext: any): Promise<any>;
    validateInput(input: any): Promise<boolean>;
    getHealthStatus(): Promise<{
        healthy: boolean;
        issues: string[];
        lastCheck: Date;
    }>;
    updateConfiguration(config: Partial<AgentConfiguration>): Promise<void>;
    shutdown(): Promise<void>;
}
import { AgentStatus } from '../types/agent.js';
//# sourceMappingURL=AgentFactory.d.ts.map