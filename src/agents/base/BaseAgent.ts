import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { AgentResult, AgentConfig, AgentType } from '@/types';
import { Logger } from '@/utils/Logger';
import { MetricsCollector } from '@/utils/MetricsCollector';

export abstract class BaseAgent<TInput = any, TOutput = any> extends EventEmitter {
  protected readonly id: string;
  protected readonly type: AgentType;
  protected readonly config: AgentConfig;
  protected readonly logger: Logger;
  protected readonly metrics: MetricsCollector;

  constructor(type: AgentType, config: AgentConfig) {
    super();
    this.id = uuidv4();
    this.type = type;
    this.config = config;
    this.logger = new Logger(`Agent:${type}:${this.id.slice(0, 8)}`);
    this.metrics = MetricsCollector.getInstance();
  }

  public getId(): string {
    return this.id;
  }

  public getType(): AgentType {
    return this.type;
  }

  public async execute(input: TInput): Promise<AgentResult<TOutput>> {
    const startTime = Date.now();
    const executionId = uuidv4();

    this.logger.info(`Starting execution`, {
      executionId,
      agentId: this.id,
      agentType: this.type
    });

    this.emit('execution:start', { executionId, agentId: this.id, input });

    try {
      // Pre-execution validation
      await this.validateInput(input);

      // Main execution with timeout
      const result = await this.executeWithTimeout(input);

      // Post-execution validation
      await this.validateOutput(result);

      const processingTime = Date.now() - startTime;

      const agentResult: AgentResult<TOutput> = {
        agent_id: this.id,
        agent_type: this.type,
        status: 'success',
        confidence: result.confidence,
        data: result.data,
        reasoning: result.reasoning,
        processing_time_ms: processingTime,
        timestamp: new Date(),
        metadata: {
          executionId,
          model_used: this.config.model_name,
          retry_count: 0,
          ...result.metadata
        }
      };

      this.logger.info(`Execution completed successfully`, {
        executionId,
        processingTime,
        confidence: result.confidence
      });

      this.emit('execution:success', { executionId, result: agentResult });
      this.metrics.recordAgentExecution(this.type, processingTime, true);

      return agentResult;

    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error(`Execution failed`, {
        executionId,
        error: error.message,
        stack: error.stack,
        processingTime
      });

      const agentResult: AgentResult<TOutput> = {
        agent_id: this.id,
        agent_type: this.type,
        status: 'failure',
        confidence: 0,
        data: null as TOutput,
        reasoning: `Execution failed: ${error.message}`,
        processing_time_ms: processingTime,
        timestamp: new Date(),
        metadata: {
          executionId,
          error: error.message,
          model_used: this.config.model_name
        }
      };

      this.emit('execution:error', { executionId, error, result: agentResult });
      this.metrics.recordAgentExecution(this.type, processingTime, false);

      return agentResult;
    }
  }

  private async executeWithTimeout(input: TInput): Promise<{
    confidence: number;
    data: TOutput;
    reasoning: string;
    metadata?: Record<string, any>;
  }> {
    return new Promise(async (resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Agent execution timeout after ${this.config.timeout_ms}ms`));
      }, this.config.timeout_ms);

      try {
        const result = await this.process(input);
        clearTimeout(timer);
        resolve(result);
      } catch (error) {
        clearTimeout(timer);
        reject(error);
      }
    });
  }

  protected abstract process(input: TInput): Promise<{
    confidence: number;
    data: TOutput;
    reasoning: string;
    metadata?: Record<string, any>;
  }>;

  protected async validateInput(input: TInput): Promise<void> {
    if (!input) {
      throw new Error('Input cannot be null or undefined');
    }
    // Override in subclasses for specific validation
  }

  protected async validateOutput(output: {
    confidence: number;
    data: TOutput;
    reasoning: string;
  }): Promise<void> {
    if (typeof output.confidence !== 'number' || output.confidence < 0 || output.confidence > 1) {
      throw new Error('Confidence must be a number between 0 and 1');
    }

    if (!output.reasoning || output.reasoning.trim().length === 0) {
      throw new Error('Reasoning cannot be empty');
    }

    if (output.data === null || output.data === undefined) {
      throw new Error('Output data cannot be null or undefined');
    }
    // Override in subclasses for specific validation
  }

  protected createPrompt(template: string, variables: Record<string, any>): string {
    let prompt = template;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      prompt = prompt.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return prompt;
  }

  protected extractConfidence(text: string): number {
    // Extract confidence from model response
    const confidenceMatch = text.match(/confidence[:\s]*(\d+(?:\.\d+)?)/i);
    if (confidenceMatch) {
      const confidence = parseFloat(confidenceMatch[1]);
      return confidence > 1 ? confidence / 100 : confidence;
    }

    // Default confidence calculation based on response characteristics
    return this.calculateDefaultConfidence(text);
  }

  private calculateDefaultConfidence(text: string): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence for longer, more detailed responses
    if (text.length > 200) confidence += 0.1;
    if (text.length > 500) confidence += 0.1;

    // Increase confidence for structured responses
    if (text.includes('because') || text.includes('therefore')) confidence += 0.1;
    if (text.includes('evidence') || text.includes('indicates')) confidence += 0.1;

    // Decrease confidence for uncertainty markers
    if (text.includes('might') || text.includes('possibly') || text.includes('uncertain')) {
      confidence -= 0.2;
    }

    return Math.max(0.1, Math.min(0.9, confidence));
  }

  protected parseStructuredResponse<T>(response: string, schema: any): T {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed as T;
      }

      // Fallback to text parsing based on schema
      return this.parseTextResponse<T>(response, schema);
    } catch (error) {
      this.logger.warn('Failed to parse structured response', { error: error.message, response });
      throw new Error(`Failed to parse agent response: ${error.message}`);
    }
  }

  private parseTextResponse<T>(response: string, schema: any): T {
    // Simple text parsing fallback - implement based on specific needs
    const result: any = {};

    for (const [key, type] of Object.entries(schema)) {
      const pattern = new RegExp(`${key}[:\\s]*([^\\n]*)`);
      const match = response.match(pattern);

      if (match) {
        const value = match[1].trim();

        if (type === 'number') {
          result[key] = parseFloat(value) || 0;
        } else if (type === 'boolean') {
          result[key] = ['true', 'yes', '1'].includes(value.toLowerCase());
        } else {
          result[key] = value;
        }
      }
    }

    return result as T;
  }

  public async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const startTime = Date.now();

      // Test basic functionality with minimal input
      const testResult = await this.process({} as TInput);

      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        details: {
          agentId: this.id,
          agentType: this.type,
          responseTime,
          modelProvider: this.config.model_provider,
          modelName: this.config.model_name,
          lastCheck: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          agentId: this.id,
          agentType: this.type,
          error: error.message,
          lastCheck: new Date().toISOString()
        }
      };
    }
  }
}