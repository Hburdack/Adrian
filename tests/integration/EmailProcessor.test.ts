import { EmailProcessor } from '../../src/pipeline/EmailProcessor.js';
import { EmailContextBuilder } from '../../src/pipeline/EmailContextBuilder.js';
import { PipelineOrchestrator } from '../../src/pipeline/PipelineOrchestrator.js';
import { MetricsCollector } from '../../src/monitoring/MetricsCollector.js';
import { Email, EmailContext } from '../../src/types/email.js';
import { ProcessingResult } from '../../src/types/pipeline.js';

// Mock dependencies
jest.mock('../../src/pipeline/EmailContextBuilder.js');
jest.mock('../../src/pipeline/PipelineOrchestrator.js');
jest.mock('../../src/monitoring/MetricsCollector.js');

describe('EmailProcessor Integration', () => {
  let emailProcessor: EmailProcessor;
  let mockContextBuilder: jest.Mocked<EmailContextBuilder>;
  let mockPipelineOrchestrator: jest.Mocked<PipelineOrchestrator>;
  let mockMetricsCollector: jest.Mocked<MetricsCollector>;

  beforeEach(() => {
    mockContextBuilder = new EmailContextBuilder() as jest.Mocked<EmailContextBuilder>;
    mockPipelineOrchestrator = new PipelineOrchestrator({} as any, {} as any) as jest.Mocked<PipelineOrchestrator>;
    mockMetricsCollector = new MetricsCollector() as jest.Mocked<MetricsCollector>;

    emailProcessor = new EmailProcessor(
      mockPipelineOrchestrator,
      mockContextBuilder,
      mockMetricsCollector
    );

    // Setup mocks
    mockContextBuilder.buildContext = jest.fn();
    mockPipelineOrchestrator.listPipelines = jest.fn();
    mockPipelineOrchestrator.executePipeline = jest.fn();
    mockMetricsCollector.recordEmailReceived = jest.fn();
    mockMetricsCollector.recordEmailProcessed = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('email processing workflow', () => {
    let mockEmail: Email;
    let mockContext: EmailContext;
    let mockResult: ProcessingResult;

    beforeEach(() => {
      mockEmail = {
        id: 'email-1',
        from: { email: 'user@example.com', name: 'Test User' },
        to: [{ email: 'support@company.com' }],
        subject: 'Test Support Request',
        body: { text: 'I need help with my account' },
        attachments: [],
        receivedAt: new Date(),
        sentAt: new Date(),
        metadata: {
          messageId: 'msg-1',
          priority: 'normal',
          tags: [],
          labels: []
        },
        rawHeaders: {}
      } as Email;

      mockContext = {
        email: mockEmail
      };

      mockResult = {
        triage: {
          category: 'support',
          priority: 'normal',
          confidence: 0.8,
          suggestedActions: ['assign_to_support'],
          requiresHumanReview: false,
          metadata: {}
        },
        actions: [],
        tags: ['support', 'account'],
        confidence: 0.8
      };

      // Setup mock implementations
      mockContextBuilder.buildContext.mockResolvedValue(mockContext);
      mockPipelineOrchestrator.listPipelines.mockResolvedValue([
        {
          id: 'default-pipeline',
          configuration: {} as any,
          execute: jest.fn(),
          getExecutionStatus: jest.fn(),
          cancelExecution: jest.fn(),
          pauseExecution: jest.fn(),
          resumeExecution: jest.fn(),
          getExecutionHistory: jest.fn()
        }
      ]);
      mockPipelineOrchestrator.executePipeline.mockResolvedValue(mockResult);
    });

    it('should process email successfully', async () => {
      await emailProcessor.start();

      const result = await emailProcessor.processEmail(mockEmail);

      expect(result).toEqual(mockResult);
      expect(mockContextBuilder.buildContext).toHaveBeenCalledWith(mockEmail);
      expect(mockPipelineOrchestrator.executePipeline).toHaveBeenCalledWith(
        'default-pipeline',
        mockContext
      );
      expect(mockMetricsCollector.recordEmailReceived).toHaveBeenCalledWith('processor');
      expect(mockMetricsCollector.recordEmailProcessed).toHaveBeenCalledWith(
        'default',
        true,
        expect.any(Number)
      );
    });

    it('should handle processing errors with retry', async () => {
      const error = new Error('Processing failed');
      mockPipelineOrchestrator.executePipeline
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockResult);

      await emailProcessor.start();

      // Mock timer to speed up test
      jest.useFakeTimers();

      const resultPromise = emailProcessor.processEmail(mockEmail);

      // Fast-forward retry delays
      jest.advanceTimersByTime(10000);

      const result = await resultPromise;

      expect(result).toEqual(mockResult);
      expect(mockPipelineOrchestrator.executePipeline).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });

    it('should fail permanently after max retries', async () => {
      const error = new Error('Persistent failure');
      mockPipelineOrchestrator.executePipeline.mockRejectedValue(error);

      await emailProcessor.start();

      jest.useFakeTimers();

      const resultPromise = emailProcessor.processEmail(mockEmail);

      // Fast-forward all retry attempts
      jest.advanceTimersByTime(20000);

      await expect(resultPromise).rejects.toThrow('Persistent failure');

      expect(mockPipelineOrchestrator.executePipeline).toHaveBeenCalledTimes(3);
      expect(mockMetricsCollector.recordEmailProcessed).toHaveBeenCalledWith(
        'default',
        false,
        expect.any(Number)
      );

      jest.useRealTimers();
    });

    it('should process batch of emails', async () => {
      const emails = [
        { ...mockEmail, id: 'email-1' },
        { ...mockEmail, id: 'email-2' },
        { ...mockEmail, id: 'email-3' }
      ];

      await emailProcessor.start();

      const results = await emailProcessor.processBatch(emails);

      expect(results).toHaveLength(3);
      expect(results.every(result => result === mockResult)).toBe(true);
      expect(mockContextBuilder.buildContext).toHaveBeenCalledTimes(3);
      expect(mockPipelineOrchestrator.executePipeline).toHaveBeenCalledTimes(3);
    });

    it('should track processing status correctly', async () => {
      await emailProcessor.start();

      // Check initial status
      let status = await emailProcessor.getProcessingStatus();
      expect(status.queued).toBe(0);
      expect(status.processing).toBe(0);
      expect(status.completed).toBe(0);
      expect(status.failed).toBe(0);

      // Process an email
      await emailProcessor.processEmail(mockEmail);

      // Check final status
      status = await emailProcessor.getProcessingStatus();
      expect(status.completed).toBe(1);
    });
  });

  describe('priority handling', () => {
    it('should process urgent emails with higher priority', async () => {
      const normalEmail = {
        id: 'normal-email',
        subject: 'Normal request',
        metadata: { priority: 'normal' as const }
      } as Email;

      const urgentEmail = {
        id: 'urgent-email',
        subject: 'URGENT: Critical issue',
        metadata: { priority: 'urgent' as const }
      } as Email;

      const processedOrder: string[] = [];

      mockPipelineOrchestrator.executePipeline.mockImplementation(async (pipelineId, context) => {
        processedOrder.push(context.email.id);
        return mockResult;
      });

      await emailProcessor.start();

      // Queue normal email first, then urgent
      const promises = [
        emailProcessor.processEmail(normalEmail),
        emailProcessor.processEmail(urgentEmail)
      ];

      await Promise.all(promises);

      // Urgent email should be processed first
      expect(processedOrder[0]).toBe('urgent-email');
    });
  });

  describe('lifecycle management', () => {
    it('should start and stop properly', async () => {
      await emailProcessor.start();
      await emailProcessor.stop();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should reject processing when stopped', async () => {
      // Don't start the processor
      await expect(emailProcessor.processEmail({} as Email))
        .rejects.toThrow('Email processor stopped');
    });

    it('should handle double start gracefully', async () => {
      await emailProcessor.start();
      await emailProcessor.start(); // Should not throw

      expect(true).toBe(true);
    });
  });

  describe('error scenarios', () => {
    beforeEach(async () => {
      await emailProcessor.start();
    });

    it('should handle context building failure', async () => {
      const error = new Error('Context build failed');
      mockContextBuilder.buildContext.mockRejectedValue(error);

      await expect(emailProcessor.processEmail({} as Email))
        .rejects.toThrow('Context build failed');
    });

    it('should handle no available pipelines', async () => {
      mockPipelineOrchestrator.listPipelines.mockResolvedValue([]);

      await expect(emailProcessor.processEmail({} as Email))
        .rejects.toThrow('No pipelines available for processing');
    });
  });
});