import 'reflect-metadata';
import { Configuration } from './config/Configuration.js';
import { MetricsCollector } from './monitoring/MetricsCollector.js';
import type { IAgentOrchestrator } from './interfaces/IAgentOrchestrator.js';
import type { IPipelineOrchestrator } from './interfaces/IPipeline.js';
import type { IEmailProcessor } from './interfaces/IEmailProcessor.js';
import './container/container.js';
export declare class ZetifyEmailTriageSystem {
    private logger;
    private configuration;
    private metricsCollector;
    private healthChecker;
    private agentOrchestrator;
    private pipelineOrchestrator;
    private emailProcessor;
    private isInitialized;
    private isRunning;
    constructor();
    initialize(): Promise<void>;
    start(): Promise<void>;
    stop(): Promise<void>;
    getSystemStatus(): Promise<{
        initialized: boolean;
        running: boolean;
        health: any;
        metrics: any;
        configuration: any;
    }>;
    getAgentOrchestrator(): IAgentOrchestrator;
    getPipelineOrchestrator(): IPipelineOrchestrator;
    getEmailProcessor(): IEmailProcessor;
    getMetricsCollector(): MetricsCollector;
    getConfiguration(): Configuration;
}
export { ZetifyEmailTriageSystem };
export declare const zetifySystem: ZetifyEmailTriageSystem;
//# sourceMappingURL=index.d.ts.map