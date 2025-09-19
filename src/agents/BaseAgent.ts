import { injectable } from 'inversify';
import type {
  AgentConfiguration,
  AgentStatus,
  AgentTask,
  AgentResult,
  AgentExecutionContext,
  AgentMetrics
} from '../types/agent.js';
import type { EmailContext } from '../types/email.js';
import type { IAgent } from '../interfaces/IAgent.js';
import { Logger } from '../monitoring/Logger.js';

@injectable()
export abstract class BaseAgent implements IAgent {
  protected logger: Logger;
  protected _configuration: AgentConfiguration;
  protected _status: AgentStatus = AgentStatus.IDLE;
  protected _metrics: AgentMetrics;

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

  get metrics(): AgentMetrics {
    return { ...this._metrics };
  }

  async initialize(config: AgentConfiguration): Promise<void> {
    this.logger.info('Initializing agent', { agentId: config.id, name: config.name });

    this._configuration = config;
    this._status = config.enabled ? AgentStatus.IDLE : AgentStatus.DISABLED;

    await this.onInitialize();

    this.logger.info('Agent initialized successfully', { agentId: this.id });
  }

  abstract canHandle(task: AgentTask): boolean;

  async execute<TInput, TOutput>(
    task: AgentTask<TInput, TOutput>,
    context: EmailContext,
    executionContext: AgentExecutionContext
  ): Promise<AgentResult<TOutput>> {
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

    } catch (error) {
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

  async validateInput<T>(input: T): Promise<boolean> {
    // Default validation - can be overridden
    return input != null;
  }

  async getHealthStatus(): Promise<{
    healthy: boolean;
    issues: string[];
    lastCheck: Date;
  }> {
    const issues: string[] = [];
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

  async updateConfiguration(config: Partial<AgentConfiguration>): Promise<void> {
    this.logger.info('Updating agent configuration', { agentId: this.id });

    this._configuration = { ...this._configuration, ...config };

    if (config.enabled !== undefined) {
      this._status = config.enabled ? AgentStatus.IDLE : AgentStatus.DISABLED;
    }

    await this.onConfigurationUpdate(config);
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down agent', { agentId: this.id });

    this._status = AgentStatus.DISABLED;
    await this.onShutdown();

    this.logger.info('Agent shutdown complete', { agentId: this.id });
  }

  // Abstract methods to be implemented by concrete agents
  protected abstract executeTask<TInput, TOutput>(
    task: AgentTask<TInput, TOutput>,
    context: EmailContext,
    executionContext: AgentExecutionContext
  ): Promise<AgentResult<TOutput>>;

  // Lifecycle hooks
  protected async onInitialize(): Promise<void> {
    // Override in derived classes if needed
  }

  protected async onConfigurationUpdate(config: Partial<AgentConfiguration>): Promise<void> {
    // Override in derived classes if needed
  }

  protected async onShutdown(): Promise<void> {
    // Override in derived classes if needed
  }

  private updateMetrics(success: boolean, processingTime: number): void {
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
}