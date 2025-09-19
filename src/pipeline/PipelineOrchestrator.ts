import { injectable, inject } from 'inversify';
import type {
  PipelineConfiguration,
  PipelineExecution,
  ProcessingResult
} from '../types/pipeline.js';
import type { EmailContext } from '../types/email.js';
import type { IPipeline, IPipelineOrchestrator } from '../interfaces/IPipeline.js';
import type { IAgentOrchestrator } from '../interfaces/IAgentOrchestrator.js';
import { Pipeline } from './Pipeline.js';
import { Logger } from '../monitoring/Logger.js';
import { MetricsCollector } from '../monitoring/MetricsCollector.js';
import { TYPES } from '../types/container.js';

@injectable()
export class PipelineOrchestrator implements IPipelineOrchestrator {
  private logger: Logger;
  private pipelines = new Map<string, IPipeline>();

  constructor(
    @inject(TYPES.AgentOrchestrator) private agentOrchestrator: IAgentOrchestrator,
    @inject(TYPES.MetricsCollector) private metricsCollector: MetricsCollector
  ) {
    this.logger = new Logger('PipelineOrchestrator');
  }

  async registerPipeline(pipeline: IPipeline): Promise<void> {
    this.logger.info('Registering pipeline', {
      pipelineId: pipeline.id,
      configuration: pipeline.configuration
    });

    this.pipelines.set(pipeline.id, pipeline);

    this.logger.info('Pipeline registered successfully', { pipelineId: pipeline.id });
  }

  async getPipeline(id: string): Promise<IPipeline | null> {
    return this.pipelines.get(id) || null;
  }

  async listPipelines(): Promise<IPipeline[]> {
    return Array.from(this.pipelines.values());
  }

  async executePipeline(pipelineId: string, context: EmailContext): Promise<ProcessingResult> {
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

    } catch (error) {
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

  async getMetrics(_pipelineId?: string): Promise<{
    totalExecutions: number;
    successRate: number;
    averageExecutionTime: number;
    errorRate: number;
  }> {
    // This would typically query from metrics storage
    // For now, return mock data
    return {
      totalExecutions: 0,
      successRate: 0,
      averageExecutionTime: 0,
      errorRate: 0
    };
  }

  async createPipelineFromConfiguration(config: PipelineConfiguration): Promise<IPipeline> {
    this.logger.info('Creating pipeline from configuration', { pipelineId: config.id });

    const pipeline = new Pipeline(this.agentOrchestrator, config);
    await this.registerPipeline(pipeline);

    return pipeline;
  }
}