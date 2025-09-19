var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { injectable } from 'inversify';
import { Logger } from '../monitoring/Logger.js';
let BaseAgent = class BaseAgent {
    logger;
    _configuration;
    _status = AgentStatus.IDLE;
    _metrics;
    constructor() {
        this.logger = new Logger(this.constructor.name);
        this._metrics = {
            totalProcessed: 0,
            successRate: 0,
            averageProcessingTime: 0,
            lastActivity: new Date(),
            errorCount: 0
        };
    }
    get id() {
        return this._configuration.id;
    }
    get name() {
        return this._configuration.name;
    }
    get configuration() {
        return { ...this._configuration };
    }
    get status() {
        return this._status;
    }
    get metrics() {
        return { ...this._metrics };
    }
    async initialize(config) {
        this.logger.info('Initializing agent', { agentId: config.id, name: config.name });
        this._configuration = config;
        this._status = config.enabled ? AgentStatus.IDLE : AgentStatus.DISABLED;
        await this.onInitialize();
        this.logger.info('Agent initialized successfully', { agentId: this.id });
    }
    async execute(task, context, executionContext) {
        const startTime = Date.now();
        this._status = AgentStatus.BUSY;
        this._metrics.lastActivity = new Date();
        this.logger.info('Starting task execution', {
            taskId: task.id,
            taskType: task.type,
            agentId: this.id
        });
        try {
            // Validate input
            const isValid = await this.validateInput(task.input);
            if (!isValid) {
                throw new Error('Invalid task input');
            }
            // Execute the task
            const result = await this.executeTask(task, context, executionContext);
            // Update metrics
            const processingTime = Date.now() - startTime;
            this.updateMetrics(true, processingTime);
            this._status = AgentStatus.IDLE;
            this.logger.info('Task execution completed', {
                taskId: task.id,
                processingTime,
                success: result.success
            });
            return {
                ...result,
                processingTime
            };
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            this.updateMetrics(false, processingTime);
            this._status = AgentStatus.ERROR;
            this.logger.error('Task execution failed', {
                taskId: task.id,
                error: error instanceof Error ? error.message : String(error),
                processingTime
            });
            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
                confidence: 0,
                processingTime,
                metadata: { agentId: this.id, taskId: task.id }
            };
        }
    }
    async validateInput(input) {
        // Default validation - can be overridden
        return input != null;
    }
    async getHealthStatus() {
        const issues = [];
        const lastCheck = new Date();
        // Check basic health indicators
        if (this._status === AgentStatus.ERROR) {
            issues.push('Agent is in error state');
        }
        if (this._metrics.errorCount > 10) {
            issues.push('High error count detected');
        }
        if (this._metrics.successRate < 0.8 && this._metrics.totalProcessed > 5) {
            issues.push('Low success rate');
        }
        return {
            healthy: issues.length === 0,
            issues,
            lastCheck
        };
    }
    async updateConfiguration(config) {
        this.logger.info('Updating agent configuration', { agentId: this.id });
        this._configuration = { ...this._configuration, ...config };
        if (config.enabled !== undefined) {
            this._status = config.enabled ? AgentStatus.IDLE : AgentStatus.DISABLED;
        }
        await this.onConfigurationUpdate(config);
    }
    async shutdown() {
        this.logger.info('Shutting down agent', { agentId: this.id });
        this._status = AgentStatus.DISABLED;
        await this.onShutdown();
        this.logger.info('Agent shutdown complete', { agentId: this.id });
    }
    // Lifecycle hooks
    async onInitialize() {
        // Override in derived classes if needed
    }
    async onConfigurationUpdate(config) {
        // Override in derived classes if needed
    }
    async onShutdown() {
        // Override in derived classes if needed
    }
    updateMetrics(success, processingTime) {
        this._metrics.totalProcessed++;
        this._metrics.lastActivity = new Date();
        if (!success) {
            this._metrics.errorCount++;
        }
        // Calculate success rate
        const successCount = this._metrics.totalProcessed - this._metrics.errorCount;
        this._metrics.successRate = successCount / this._metrics.totalProcessed;
        // Update average processing time
        this._metrics.averageProcessingTime =
            (this._metrics.averageProcessingTime * (this._metrics.totalProcessed - 1) + processingTime)
                / this._metrics.totalProcessed;
    }
};
BaseAgent = __decorate([
    injectable(),
    __metadata("design:paramtypes", [])
], BaseAgent);
export { BaseAgent };
//# sourceMappingURL=BaseAgent.js.map