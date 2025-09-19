import { EventEmitter } from 'events';
import type { Email } from '../types/email.js';
import type { ProcessingResult } from '../types/pipeline.js';
import type { IEmailProcessor, IEmailContextBuilder } from '../interfaces/IEmailProcessor.js';
import type { IPipelineOrchestrator } from '../interfaces/IPipeline.js';
import { MetricsCollector } from '../monitoring/MetricsCollector.js';
export declare class EmailProcessor extends EventEmitter implements IEmailProcessor {
    private pipelineOrchestrator;
    private contextBuilder;
    private metricsCollector;
    private logger;
    private processingQueue;
    private isProcessing;
    private maxConcurrentProcessing;
    private currentlyProcessing;
    private processingStats;
    constructor(pipelineOrchestrator: IPipelineOrchestrator, contextBuilder: IEmailContextBuilder, metricsCollector: MetricsCollector);
    processEmail(email: Email): Promise<ProcessingResult>;
    processBatch(emails: Email[]): Promise<ProcessingResult[]>;
    getProcessingStatus(): Promise<{
        queued: number;
        processing: number;
        completed: number;
        failed: number;
    }>;
    start(): Promise<void>;
    stop(): Promise<void>;
    private processQueueIfReady;
    private processEmailInternal;
    private calculatePriority;
    private resetStats;
}
//# sourceMappingURL=EmailProcessor.d.ts.map