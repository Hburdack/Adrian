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
// Import concrete agent implementations
// These would be implemented as specific agent types
// import { TriageAgent } from '../agents/TriageAgent.js';
// import { ResponseAgent } from '../agents/ResponseAgent.js';
// import { ClassificationAgent } from '../agents/ClassificationAgent.js';
let AgentFactory = class AgentFactory {
    logger;
    agentConstructors = new Map();
    constructor() {
        this.logger = new Logger('AgentFactory');
        this.registerDefaultAgentTypes();
    }
    async createAgent(type, config) {
        this.logger.info('Creating agent', { type, agentId: config.id });
        const AgentConstructor = this.agentConstructors.get(type.toLowerCase());
        if (!AgentConstructor) {
            throw new Error(`Unknown agent type: ${type}`);
        }
        try {
            const agent = new AgentConstructor();
            await agent.initialize(config);
            this.logger.info('Agent created successfully', {
                type,
                agentId: config.id,
                name: config.name
            });
            return agent;
        }
        catch (error) {
            this.logger.error('Failed to create agent', {
                type,
                agentId: config.id,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to create agent of type ${type}: ${error}`);
        }
    }
    getAvailableTypes() {
        return Array.from(this.agentConstructors.keys());
    }
    registerAgentType(type, constructor) {
        this.logger.info('Registering agent type', { type });
        this.agentConstructors.set(type.toLowerCase(), constructor);
        this.logger.info('Agent type registered successfully', { type });
    }
    registerDefaultAgentTypes() {
        // Register default agent types
        // In a real implementation, you would import and register concrete agent classes
        // Example:
        // this.registerAgentType('triage', TriageAgent);
        // this.registerAgentType('response', ResponseAgent);
        // this.registerAgentType('classification', ClassificationAgent);
        this.logger.info('Default agent types registered');
    }
};
AgentFactory = __decorate([
    injectable(),
    __metadata("design:paramtypes", [])
], AgentFactory);
export { AgentFactory };
// Mock agent implementation for testing
export class MockAgent {
    _configuration;
    _status = AgentStatus.IDLE;
    _metrics = {
        totalProcessed: 0,
        successRate: 1.0,
        averageProcessingTime: 100,
        lastActivity: new Date(),
        errorCount: 0
    };
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
        this._configuration = config;
        this._status = config.enabled ? AgentStatus.IDLE : AgentStatus.DISABLED;
    }
    canHandle(task) {
        return true; // Mock implementation accepts all tasks
    }
    async execute(task, context, executionContext) {
        // Mock execution
        await new Promise(resolve => setTimeout(resolve, 50));
        this._metrics.totalProcessed++;
        this._metrics.lastActivity = new Date();
        return {
            success: true,
            data: { mockResult: true },
            confidence: 0.9,
            processingTime: 50,
            metadata: { agentId: this.id }
        };
    }
    async validateInput(input) {
        return input != null;
    }
    async getHealthStatus() {
        return {
            healthy: true,
            issues: [],
            lastCheck: new Date()
        };
    }
    async updateConfiguration(config) {
        this._configuration = { ...this._configuration, ...config };
    }
    async shutdown() {
        this._status = AgentStatus.DISABLED;
    }
}
import { AgentStatus } from '../types/agent.js';
//# sourceMappingURL=AgentFactory.js.map