import { injectable, inject } from 'inversify';
import { EventEmitter } from 'events';
import type { Email } from '../types/email.js';
import type { ProcessingResult } from '../types/pipeline.js';
import type { IEmailProcessor, IEmailContextBuilder } from '../interfaces/IEmailProcessor.js';
import type { IPipelineOrchestrator } from '../interfaces/IPipeline.js';
import { Logger } from '../monitoring/Logger.js';
import { MetricsCollector } from '../monitoring/MetricsCollector.js';
import { TYPES } from '../types/container.js';

interface ProcessingQueueItem {
  email: Email;
  priority: number;
  attempts: number;
  createdAt: Date;
  resolve: (result: ProcessingResult) => void;
  reject: (error: Error) => void;
}

@injectable()
export class EmailProcessor extends EventEmitter implements IEmailProcessor {
  private logger: Logger;
  private processingQueue: ProcessingQueueItem[] = [];
  private isProcessing = false;
  private maxConcurrentProcessing = 5;
  private currentlyProcessing = 0;
  private processingStats = {
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0
  };

  constructor(
    @inject(TYPES.PipelineOrchestrator) private pipelineOrchestrator: IPipelineOrchestrator,
    @inject(TYPES.EmailContextBuilder) private contextBuilder: IEmailContextBuilder,
    @inject(TYPES.MetricsCollector) private metricsCollector: MetricsCollector
  ) {
    super();
    this.logger = new Logger('EmailProcessor');
  }

  async processEmail(email: Email): Promise<ProcessingResult> {
    return new Promise((resolve, reject) => {
      const queueItem: ProcessingQueueItem = {
        email,
        priority: this.calculatePriority(email),
        attempts: 0,
        createdAt: new Date(),
        resolve,
        reject
      };

      this.processingQueue.push(queueItem);
      this.processingStats.queued++;

      this.logger.info('Email queued for processing', {
        emailId: email.id,
        from: email.from.email,
        subject: email.subject.substring(0, 100),
        priority: queueItem.priority,
        queueSize: this.processingQueue.length
      });

      this.metricsCollector.recordEmailReceived('processor');
      this.processQueueIfReady();
    });
  }

  async processBatch(emails: Email[]): Promise<ProcessingResult[]> {
    this.logger.info('Processing email batch', { batchSize: emails.length });

    const promises = emails.map(email => this.processEmail(email));
    return Promise.all(promises);
  }

  async getProcessingStatus(): Promise<{
    queued: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    return {
      queued: this.processingStats.queued,
      processing: this.processingStats.processing,
      completed: this.processingStats.completed,
      failed: this.processingStats.failed
    };
  }

  async start(): Promise<void> {
    if (this.isProcessing) {
      this.logger.warn('Email processor is already running');
      return;
    }

    this.logger.info('Starting email processor', {
      maxConcurrentProcessing: this.maxConcurrentProcessing
    });

    this.isProcessing = true;
    this.processQueueIfReady();

    this.logger.info('Email processor started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    this.logger.info('Stopping email processor');

    this.isProcessing = false;

    // Wait for current processing to complete
    while (this.currentlyProcessing > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Reject all queued items
    for (const item of this.processingQueue) {
      item.reject(new Error('Email processor stopped'));
    }

    this.processingQueue = [];
    this.resetStats();

    this.logger.info('Email processor stopped');
  }

  private async processQueueIfReady(): Promise<void> {
    if (!this.isProcessing || this.currentlyProcessing >= this.maxConcurrentProcessing) {
      return;
    }

    // Sort queue by priority (higher priority first)
    this.processingQueue.sort((a, b) => b.priority - a.priority);

    const queueItem = this.processingQueue.shift();
    if (!queueItem) {
      return;
    }

    this.currentlyProcessing++;
    this.processingStats.queued--;
    this.processingStats.processing++;

    // Process in background
    this.processEmailInternal(queueItem).finally(() => {
      this.currentlyProcessing--;
      // Continue processing queue
      this.processQueueIfReady();
    });

    // If there are more items and capacity, continue processing
    if (this.processingQueue.length > 0 && this.currentlyProcessing < this.maxConcurrentProcessing) {
      setImmediate(() => this.processQueueIfReady());
    }
  }

  private async processEmailInternal(queueItem: ProcessingQueueItem): Promise<void> {
    const { email, attempts } = queueItem;
    const startTime = Date.now();

    this.logger.info('Processing email', {
      emailId: email.id,
      from: email.from.email,
      attempts: attempts + 1
    });

    try {
      // Build context for the email
      const context = await this.contextBuilder.buildContext(email);

      // Get default pipeline (in a real implementation, you'd select based on email characteristics)
      const pipelines = await this.pipelineOrchestrator.listPipelines();
      if (pipelines.length === 0) {
        throw new Error('No pipelines available for processing');
      }

      const defaultPipeline = pipelines[0]!;
      const result = await this.pipelineOrchestrator.executePipeline(defaultPipeline.id, context);

      const processingTime = Date.now() - startTime;

      this.processingStats.processing--;
      this.processingStats.completed++;

      this.metricsCollector.recordEmailProcessed('default', true, processingTime);

      this.logger.info('Email processed successfully', {
        emailId: email.id,
        pipelineId: defaultPipeline.id,
        processingTime,
        confidence: result.confidence
      });

      this.emit('emailProcessed', {
        email,
        result,
        processingTime
      });

      queueItem.resolve(result);

    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.processingStats.processing--;

      queueItem.attempts++;

      // Retry logic
      const maxRetries = 3;
      if (queueItem.attempts < maxRetries) {
        this.logger.warn('Email processing failed, retrying', {
          emailId: email.id,
          attempts: queueItem.attempts,
          maxRetries,
          error: error instanceof Error ? error.message : String(error)
        });

        // Re-queue with exponential backoff
        setTimeout(() => {
          this.processingQueue.push(queueItem);
          this.processingStats.queued++;
          this.processQueueIfReady();
        }, Math.pow(2, queueItem.attempts) * 1000);

      } else {
        this.processingStats.failed++;

        this.metricsCollector.recordEmailProcessed('default', false, processingTime);

        this.logger.error('Email processing failed permanently', {
          emailId: email.id,
          attempts: queueItem.attempts,
          error: error instanceof Error ? error.message : String(error)
        });

        this.emit('emailProcessingFailed', {
          email,
          error,
          attempts: queueItem.attempts
        });

        queueItem.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  private calculatePriority(email: Email): number {
    let priority = 0;

    // Base priority from email metadata
    switch (email.metadata.priority) {
      case 'urgent':
        priority += 100;
        break;
      case 'high':
        priority += 50;
        break;
      case 'normal':
        priority += 25;
        break;
      case 'low':
        priority += 10;
        break;
    }

    // Boost priority for keywords
    const urgentKeywords = ['urgent', 'asap', 'emergency', 'critical'];
    const subject = email.subject.toLowerCase();
    const body = (email.body.text || '').toLowerCase();

    for (const keyword of urgentKeywords) {
      if (subject.includes(keyword) || body.includes(keyword)) {
        priority += 25;
      }
    }

    // Boost priority for internal emails
    const fromDomain = email.from.email.split('@')[1];
    if (fromDomain && email.to.some(to => to.email.split('@')[1] === fromDomain)) {
      priority += 10;
    }

    return priority;
  }

  private resetStats(): void {
    this.processingStats = {
      queued: 0,
      processing: 0,
      completed: 0,
      failed: 0
    };
  }
}