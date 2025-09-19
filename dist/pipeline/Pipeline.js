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
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../monitoring/Logger.js';
import { TYPES } from '../types/container.js';
let Pipeline = class Pipeline {
    agentOrchestrator;
    _configuration;
    logger;
    executions = new Map();
    constructor(agentOrchestrator, _configuration) {
        this.agentOrchestrator = agentOrchestrator;
        this._configuration = _configuration;
        this.logger = new Logger(`Pipeline:${_configuration.name}`);
    }
    get id() {
        return this._configuration.id;
    }
    get configuration() {
        return { ...this._configuration };
    }
    async execute(context) {
        const executionId = uuidv4();
        const execution = {
            id: executionId,
            pipelineId: this.id,
            emailId: context.email.id,
            startTime: new Date(),
            status: PipelineStatus.INITIALIZED,
            completedStages: [],
            failedStages: [],
            results: new Map(),
            errors: [],
            metadata: {}
        };
        this.executions.set(executionId, execution);
        this.logger.info('Starting pipeline execution', {
            executionId,
            pipelineId: this.id,
            emailId: context.email.id
        });
        try {
            execution.status = PipelineStatus.RUNNING;
            const pipelineContext = {
                ...context,
                execution,
                currentStage: this._configuration.stages[0],
                previousResults: new Map(),
                configuration: this._configuration
            };
            const result = await this.executeStages(pipelineContext);
            execution.status = PipelineStatus.COMPLETED;
            execution.endTime = new Date();
            this.logger.info('Pipeline execution completed', {
                executionId,
                duration: execution.endTime.getTime() - execution.startTime.getTime()
            });
            return result;
        }
        catch (error) {
            execution.status = PipelineStatus.FAILED;
            execution.endTime = new Date();
            const pipelineError = {
                stage: execution.currentStage || 'unknown',
                error: error instanceof Error ? error : new Error(String(error)),
                timestamp: new Date(),
                recoverable: false
            };
            execution.errors.push(pipelineError);
            this.logger.error('Pipeline execution failed', {
                executionId,
                error: pipelineError.error.message
            });
            throw error;
        }
    }
    async getExecutionStatus(executionId) {
        return this.executions.get(executionId) || null;
    }
    async cancelExecution(executionId) {
        const execution = this.executions.get(executionId);
        if (!execution || execution.status !== PipelineStatus.RUNNING) {
            return false;
        }
        execution.status = PipelineStatus.CANCELLED;
        execution.endTime = new Date();
        this.logger.info('Pipeline execution cancelled', { executionId });
        return true;
    }
    async pauseExecution(executionId) {
        const execution = this.executions.get(executionId);
        if (!execution || execution.status !== PipelineStatus.RUNNING) {
            return false;
        }
        execution.status = PipelineStatus.PAUSED;
        this.logger.info('Pipeline execution paused', { executionId });
        return true;
    }
    async resumeExecution(executionId) {
        const execution = this.executions.get(executionId);
        if (!execution || execution.status !== PipelineStatus.PAUSED) {
            return false;
        }
        execution.status = PipelineStatus.RUNNING;
        this.logger.info('Pipeline execution resumed', { executionId });
        return true;
    }
    async getExecutionHistory(limit = 100) {
        return Array.from(this.executions.values())
            .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
            .slice(0, limit);
    }
    async executeStages(context) {
        const { stages } = this._configuration;
        const results = new Map();
        for (const stage of stages) {
            // Check if stage should be skipped based on condition
            if (stage.condition && !stage.condition(context)) {
                this.logger.info('Skipping stage due to condition', { stage: stage.id });
                continue;
            }
            context.currentStage = stage;
            context.execution.currentStage = stage.id;
            this.logger.info('Executing stage', { stage: stage.id, agents: stage.agentTypes });
            try {
                const stageResults = await this.executeStage(stage, context);
                // Store results
                for (const [agentType, result] of stageResults) {
                    results.set(`${stage.id}:${agentType}`, result);
                }
                context.execution.completedStages.push(stage.id);
                context.previousResults = new Map([...context.previousResults, ...stageResults]);
            }
            catch (error) {
                context.execution.failedStages.push(stage.id);
                const pipelineError = {
                    stage: stage.id,
                    error: error instanceof Error ? error : new Error(String(error)),
                    timestamp: new Date(),
                    recoverable: stage.retryOnFailure
                };
                context.execution.errors.push(pipelineError);
                if (stage.required) {
                    if (this._configuration.failureStrategy === 'stop') {
                        throw error;
                    }
                    else if (this._configuration.failureStrategy === 'retry' && stage.retryOnFailure) {
                        // Implement retry logic here
                        this.logger.warn('Stage failed, retrying not implemented yet', { stage: stage.id });
                    }
                }
                this.logger.error('Stage execution failed', {
                    stage: stage.id,
                    error: pipelineError.error.message,
                    required: stage.required
                });
            }
        }
        context.execution.results = results;
        return this.buildProcessingResult(context, results);
    }
    async executeStage(stage, context) {
        const results = new Map();
        if (stage.parallel) {
            // Execute agents in parallel
            const promises = stage.agentTypes.map(async (agentType) => {
                const result = await this.agentOrchestrator.executeAgent(agentType, {
                    id: uuidv4(),
                    type: stage.id,
                    input: context,
                    priority: 1,
                    createdAt: new Date(),
                    maxRetries: 3,
                    currentRetries: 0,
                    timeout: stage.timeout,
                    dependencies: [],
                    metadata: { stage: stage.id }
                }, context);
                return [agentType, result];
            });
            const parallelResults = await Promise.all(promises);
            for (const [agentType, result] of parallelResults) {
                results.set(agentType, result);
            }
        }
        else {
            // Execute agents sequentially
            for (const agentType of stage.agentTypes) {
                const result = await this.agentOrchestrator.executeAgent(agentType, {
                    id: uuidv4(),
                    type: stage.id,
                    input: context,
                    priority: 1,
                    createdAt: new Date(),
                    maxRetries: 3,
                    currentRetries: 0,
                    timeout: stage.timeout,
                    dependencies: [],
                    metadata: { stage: stage.id }
                }, context);
                results.set(agentType, result);
            }
        }
        return results;
    }
    buildProcessingResult(context, results) {
        // This is a simplified implementation
        // In a real implementation, you would aggregate results from different agents
        return {
            triage: {
                category: 'general',
                priority: 'normal',
                confidence: 0.8,
                suggestedActions: ['review'],
                requiresHumanReview: false,
                metadata: {}
            },
            actions: [],
            tags: [],
            confidence: 0.8
        };
    }
};
Pipeline = __decorate([
    injectable(),
    __param(0, inject(TYPES.AgentOrchestrator)),
    __metadata("design:paramtypes", [Object, Object])
], Pipeline);
export { Pipeline };
//# sourceMappingURL=Pipeline.js.map