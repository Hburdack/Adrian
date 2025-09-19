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
import { EventEmitter } from 'events';
import { Logger } from '../monitoring/Logger.js';
import { MetricsCollector } from '../monitoring/MetricsCollector.js';
import { TYPES } from '../types/container.js';
let EmailProcessor = class EmailProcessor extends EventEmitter {
    pipelineOrchestrator;
    contextBuilder;
    metricsCollector;
    logger;
    processingQueue = [];
    isProcessing = false;
    maxConcurrentProcessing = 5;
    currentlyProcessing = 0;
    processingStats = {
        queued: 0,
        processing: 0,
        completed: 0,
        failed: 0
    };
    constructor(pipelineOrchestrator, contextBuilder, metricsCollector) {
        super();
        this.pipelineOrchestrator = pipelineOrchestrator;
        this.contextBuilder = contextBuilder;
        this.metricsCollector = metricsCollector;
        this.logger = new Logger('EmailProcessor');
    }
    async processEmail(email) {
        return new Promise((resolve, reject) => {
            const queueItem = {
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
    async processBatch(emails) {
        this.logger.info('Processing email batch', { batchSize: emails.length });
        const promises = emails.map(email => this.processEmail(email));
        return Promise.all(promises);
    }
    async getProcessingStatus() {
        return {
            queued: this.processingStats.queued,
            processing: this.processingStats.processing,
            completed: this.processingStats.completed,
            failed: this.processingStats.failed
        };
    }
    async start() {
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
    async stop() {
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
    async processQueueIfReady() {
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
    async processEmailInternal(queueItem) {
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
            const defaultPipeline = pipelines[0];
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
        }
        catch (error) {
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
            }
            else {
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
    calculatePriority(email) {
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
    resetStats() {
        this.processingStats = {
            queued: 0,
            processing: 0,
            completed: 0,
            failed: 0
        };
    }
};
EmailProcessor = __decorate([
    injectable(),
    __param(0, inject(TYPES.PipelineOrchestrator)),
    __param(1, inject(TYPES.EmailContextBuilder)),
    __param(2, inject(TYPES.MetricsCollector)),
    __metadata("design:paramtypes", [Object, Object, MetricsCollector])
], EmailProcessor);
export { EmailProcessor };
//# sourceMappingURL=EmailProcessor.js.map