import type { PipelineConfiguration, ProcessingResult } from '../types/pipeline.js';
import type { EmailContext } from '../types/email.js';
import type { IPipeline, IPipelineOrchestrator } from '../interfaces/IPipeline.js';
import type { IAgentOrchestrator } from '../interfaces/IAgentOrchestrator.js';
import { MetricsCollector } from '../monitoring/MetricsCollector.js';
export declare class PipelineOrchestrator implements IPipelineOrchestrator {
    private agentOrchestrator;
    private metricsCollector;
    private logger;
    private pipelines;
    constructor(agentOrchestrator: IAgentOrchestrator, metricsCollector: MetricsCollector);
    registerPipeline(pipeline: IPipeline): Promise<void>;
    getPipeline(id: string): Promise<IPipeline | null>;
    listPipelines(): Promise<IPipeline[]>;
    executePipeline(pipelineId: string, context: EmailContext): Promise<ProcessingResult>;
    getMetrics(pipelineId?: string): Promise<{
        totalExecutions: number;
        successRate: number;
        averageExecutionTime: number;
        errorRate: number;
    }>;
    createPipelineFromConfiguration(config: PipelineConfiguration): Promise<IPipeline>;
}
//# sourceMappingURL=PipelineOrchestrator.d.ts.map