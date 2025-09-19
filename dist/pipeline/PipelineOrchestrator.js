var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { injectable, inject } from 'inversify';
import { Pipeline } from './Pipeline.js';
import { Logger } from '../monitoring/Logger.js';
import { MetricsCollector } from '../monitoring/MetricsCollector.js';
import { TYPES } from '../types/container.js';
let PipelineOrchestrator = class PipelineOrchestrator {
    agentOrchestrator;
    metricsCollector;
    logger;
    pipelines = new Map();
    constructor(agentOrchestrator, metricsCollector) {
        this.agentOrchestrator = agentOrchestrator;
        this.metricsCollector = metricsCollector;
        this.logger = new Logger('PipelineOrchestrator');
    }
    async registerPipeline(pipeline) {
        this.logger.info('Registering pipeline', {
            pipelineId: pipeline.id,
            configuration: pipeline.configuration
        });
        this.pipelines.set(pipeline.id, pipeline);
        this.logger.info('Pipeline registered successfully', { pipelineId: pipeline.id });
    }
    async getPipeline(id) {
        return this.pipelines.get(id) || null;
    }
    async listPipelines() {
        return Array.from(this.pipelines.values());
    }
    async executePipeline(pipelineId, context) {
        const pipeline = this.pipelines.get(pipelineId);
        if (!pipeline) {
            throw new Error(`Pipeline with ID ${pipelineId} not found`);
        }
        const startTime = Date.now();
        this.logger.info('Executing pipeline', {
            pipelineId,
            emailId: context.email.id
        });
        try {
            const result = await pipeline.execute(context);
            const duration = Date.now() - startTime;
            this.metricsCollector.recordPipelineExecution(pipelineId, 'completed', duration);
            this.logger.info('Pipeline execution completed', {
                pipelineId,
                emailId: context.email.id,
                duration,
                confidence: result.confidence
            });
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.metricsCollector.recordPipelineExecution(pipelineId, 'failed', duration);
            this.logger.error('Pipeline execution failed', {
                pipelineId,
                emailId: context.email.id,
                duration,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async getMetrics(pipelineId) {
        // This would typically query from metrics storage
        // For now, return mock data
        return {
            totalExecutions: 0,
            successRate: 0,
            averageExecutionTime: 0,
            errorRate: 0
        };
    }
    async createPipelineFromConfiguration(config) {
        this.logger.info('Creating pipeline from configuration', { pipelineId: config.id });
        const pipeline = new Pipeline(this.agentOrchestrator, config);
        await this.registerPipeline(pipeline);
        return pipeline;
    }
};
PipelineOrchestrator = __decorate([
    injectable(),
    __param(0, inject(TYPES.AgentOrchestrator)),
    __param(1, inject(TYPES.MetricsCollector)),
    __metadata("design:paramtypes", [Object, MetricsCollector])
], PipelineOrchestrator);
export { PipelineOrchestrator };
//# sourceMappingURL=PipelineOrchestrator.js.map