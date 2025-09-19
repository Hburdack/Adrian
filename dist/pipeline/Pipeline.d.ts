import type { PipelineConfiguration, PipelineExecution, ProcessingResult } from '../types/pipeline.js';
import type { EmailContext } from '../types/email.js';
import type { IPipeline } from '../interfaces/IPipeline.js';
import type { IAgentOrchestrator } from '../interfaces/IAgentOrchestrator.js';
export declare class Pipeline implements IPipeline {
    private agentOrchestrator;
    private _configuration;
    private logger;
    private executions;
    constructor(agentOrchestrator: IAgentOrchestrator, _configuration: PipelineConfiguration);
    get id(): string;
    get configuration(): PipelineConfiguration;
    execute(context: EmailContext): Promise<ProcessingResult>;
    getExecutionStatus(executionId: string): Promise<PipelineExecution | null>;
    cancelExecution(executionId: string): Promise<boolean>;
    pauseExecution(executionId: string): Promise<boolean>;
    resumeExecution(executionId: string): Promise<boolean>;
    getExecutionHistory(limit?: number): Promise<PipelineExecution[]>;
    private executeStages;
    private executeStage;
    private buildProcessingResult;
}
//# sourceMappingURL=Pipeline.d.ts.map