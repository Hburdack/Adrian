import { EventEmitter } from 'events';
import type { IPipelineOrchestrator } from '../interfaces/IPipeline.js';
import type { IAgentOrchestrator } from '../interfaces/IAgentOrchestrator.js';
import { MetricsCollector } from './MetricsCollector.js';
export interface HealthCheck {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    message?: string;
    timestamp: Date;
    responseTime?: number;
    metadata?: Record<string, any>;
}
export interface SystemHealth {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    checks: HealthCheck[];
    timestamp: Date;
    uptime: number;
    version: string;
}
export interface HealthCheckConfig {
    interval: number;
    timeout: number;
    retries: number;
    enabled: boolean;
}
export declare class HealthChecker extends EventEmitter {
    private agentOrchestrator;
    private pipelineOrchestrator;
    private metricsCollector;
    private logger;
    private checks;
    private lastHealthStatus;
    private healthCheckInterval;
    private isRunning;
    constructor(agentOrchestrator: IAgentOrchestrator, pipelineOrchestrator: IPipelineOrchestrator, metricsCollector: MetricsCollector);
    start(config: HealthCheckConfig): void;
    stop(): void;
    registerHealthCheck(name: string, checkFunction: () => Promise<HealthCheck>): void;
    unregisterHealthCheck(name: string): void;
    getHealthStatus(): Promise<SystemHealth>;
    private performHealthCheck;
    private calculateOverallHealth;
    private executeWithTimeout;
    private registerDefaultHealthChecks;
}
//# sourceMappingURL=HealthChecker.d.ts.map