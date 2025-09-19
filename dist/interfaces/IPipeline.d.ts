import type { PipelineConfiguration, PipelineExecution, ProcessingResult } from '../types/pipeline.js';
import type { EmailContext } from '../types/email.js';
export interface IPipeline {
    readonly id: string;
    readonly configuration: PipelineConfiguration;
    /**
     * Execute the pipeline for a given email context
     */
    execute(context: EmailContext): Promise<ProcessingResult>;
    /**
     * Get the current execution status
     */
    getExecutionStatus(executionId: string): Promise<PipelineExecution | null>;
    /**
     * Cancel a running execution
     */
    cancelExecution(executionId: string): Promise<boolean>;
    /**
     * Pause a running execution
     */
    pauseExecution(executionId: string): Promise<boolean>;
    /**
     * Resume a paused execution
     */
    resumeExecution(executionId: string): Promise<boolean>;
    /**
     * Get execution history
     */
    getExecutionHistory(limit?: number): Promise<PipelineExecution[]>;
}
export interface IPipelineOrchestrator {
    /**
     * Register a pipeline
     */
    registerPipeline(pipeline: IPipeline): Promise<void>;
    /**
     * Get a pipeline by ID
     */
    getPipeline(id: string): Promise<IPipeline | null>;
    /**
     * List all registered pipelines
     */
    listPipelines(): Promise<IPipeline[]>;
    /**
     * Execute a pipeline by ID
     */
    executePipeline(pipelineId: string, context: EmailContext): Promise<ProcessingResult>;
    /**
     * Get pipeline execution metrics
     */
    getMetrics(pipelineId?: string): Promise<{
        totalExecutions: number;
        successRate: number;
        averageExecutionTime: number;
        errorRate: number;
    }>;
}
//# sourceMappingURL=IPipeline.d.ts.map