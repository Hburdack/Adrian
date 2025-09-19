import { injectable } from 'inversify';
import type { AgentConfiguration } from '../types/agent.js';
import type { IAgent, IAgentFactory } from '../interfaces/IAgent.js';
import { Logger } from '../monitoring/Logger.js';

// Import concrete agent implementations
// These would be implemented as specific agent types
// import { TriageAgent } from '../agents/TriageAgent.js';
// import { ResponseAgent } from '../agents/ResponseAgent.js';
// import { ClassificationAgent } from '../agents/ClassificationAgent.js';

@injectable()
export class AgentFactory implements IAgentFactory {
  private logger: Logger;
  private agentConstructors = new Map<string, new () => IAgent>();

  constructor() {
    this.logger = new Logger('AgentFactory');
    this.registerDefaultAgentTypes();
  }

  async createAgent(type: string, config: AgentConfiguration): Promise<IAgent> {
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

    } catch (error) {
      this.logger.error('Failed to create agent', {
        type,
        agentId: config.id,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new Error(`Failed to create agent of type ${type}: ${error}`);
    }
  }

  getAvailableTypes(): string[] {
    return Array.from(this.agentConstructors.keys());
  }

  registerAgentType(type: string, constructor: new () => IAgent): void {
    this.logger.info('Registering agent type', { type });

    this.agentConstructors.set(type.toLowerCase(), constructor);

    this.logger.info('Agent type registered successfully', { type });
  }

  private registerDefaultAgentTypes(): void {
    // Register default agent types
    // In a real implementation, you would import and register concrete agent classes

    // Example:
    // this.registerAgentType('triage', TriageAgent);
    // this.registerAgentType('response', ResponseAgent);
    // this.registerAgentType('classification', ClassificationAgent);

    this.logger.info('Default agent types registered');
  }
}

// Mock agent implementation for testing
export class MockAgent implements IAgent {
  private _configuration!: AgentConfiguration;
  private _status = AgentStatus.IDLE;
  private _metrics = {
    totalProcessed: 0,
    successRate: 1.0,
    averageProcessingTime: 100,
    lastActivity: new Date(),
    errorCount: 0
  };

  get id(): string {
    return this._configuration.id;
  }

  get name(): string {
    return this._configuration.name;
  }

  get configuration(): AgentConfiguration {
    return { ...this._configuration };
  }

  get status(): AgentStatus {
    return this._status;
  }

  get metrics() {
    return { ...this._metrics };
  }

  async initialize(config: AgentConfiguration): Promise<void> {
    this._configuration = config;
    this._status = config.enabled ? AgentStatus.IDLE : AgentStatus.DISABLED;
  }

  canHandle(_task: any): boolean {
    return true; // Mock implementation accepts all tasks
  }

  async execute(_task: any, _context: any, _executionContext: any): Promise<any> {
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

  async validateInput(input: any): Promise<boolean> {
    return input != null;
  }

  async getHealthStatus(): Promise<{
    healthy: boolean;
    issues: string[];
    lastCheck: Date;
  }> {
    return {
      healthy: true,
      issues: [],
      lastCheck: new Date()
    };
  }

  async updateConfiguration(config: Partial<AgentConfiguration>): Promise<void> {
    this._configuration = { ...this._configuration, ...config };
  }

  async shutdown(): Promise<void> {
    this._status = AgentStatus.DISABLED;
  }
}

import { AgentStatus } from '../types/agent.js';