import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ClassifierAgent } from '../../src/agents/classifier-agent';
import { createOpenAIMock, createConfigMock, createAuditLoggerMock } from '../mocks/service-mocks';
import { EmailGenerator } from '../fixtures/email-generator';

describe('ClassifierAgent - London School TDD', () => {
  let classifierAgent: ClassifierAgent;
  let mockOpenAIService: any;
  let mockConfigService: any;
  let mockAuditLogger: any;

  beforeEach(() => {
    // Arrange - Create mocks using factory pattern
    mockOpenAIService = createOpenAIMock();
    mockConfigService = createConfigMock();
    mockAuditLogger = createAuditLoggerMock();

    // Inject dependencies via constructor
    classifierAgent = new ClassifierAgent(
      mockOpenAIService,
      mockConfigService,
      mockAuditLogger
    );
  });

  describe('Intent Classification Behavior', () => {
    it('should classify support email and coordinate with audit logging', async () => {
      // Arrange
      const supportEmail = EmailGenerator.generateSupport();
      mockOpenAIService.classify.mockResolvedValue({
        intent: 'support',
        confidence: 0.92,
        reasoning: 'Technical issue mentioned'
      });

      // Act
      const result = await classifierAgent.classify(supportEmail);

      // Assert - Verify collaborations
      expect(mockOpenAIService.classify).toHaveBeenCalledWith(
        expect.objectContaining({
          text: supportEmail.body_text,
          subject: supportEmail.subject,
          from: supportEmail.from
        })
      );

      expect(mockAuditLogger.logClassification).toHaveBeenCalledWith(
        supportEmail.id,
        expect.objectContaining({
          intent: 'support',
          confidence: 0.92,
          status: 'ok'
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          intent: 'support',
          department: 'support',
          confidence: 0.92,
          status: 'ok'
        })
      );
    });

    it('should escalate low-confidence classifications through proper workflow', async () => {
      // Arrange
      const ambiguousEmail = EmailGenerator.generateAmbiguous();
      mockOpenAIService.classify.mockResolvedValue({
        intent: 'other',
        confidence: 0.45,
        reasoning: 'Unclear intent, multiple possible interpretations'
      });

      // Act
      const result = await classifierAgent.classify(ambiguousEmail);

      // Assert - Verify escalation behavior
      expect(result.status).toBe('needs_review');
      expect(result.confidence).toBe(0.45);

      expect(mockAuditLogger.logClassification).toHaveBeenCalledWith(
        ambiguousEmail.id,
        expect.objectContaining({
          status: 'needs_review',
          escalation_reason: 'Low confidence classification'
        })
      );
    });

    it('should handle OpenAI service failures with proper error coordination', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();
      const serviceError = new Error('OpenAI API timeout');
      mockOpenAIService.classify.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(classifierAgent.classify(email)).rejects.toThrow('Classification service unavailable');

      // Verify error handling collaboration
      expect(mockAuditLogger.logError).toHaveBeenCalledWith(
        email.id,
        expect.objectContaining({
          error: 'OpenAI API timeout',
          component: 'ClassifierAgent'
        })
      );
    });
  });

  describe('Signal Detection Coordination', () => {
    it('should detect deadline signals and coordinate with urgency assessment', async () => {
      // Arrange
      const deadlineEmail = EmailGenerator.generateWithDeadline();
      mockOpenAIService.classify.mockResolvedValue({
        intent: 'sales',
        confidence: 0.88
      });

      // Act
      const result = await classifierAgent.classify(deadlineEmail);

      // Assert - Verify signal detection behavior
      expect(result.signals.is_deadline).toBe(true);
      expect(mockAuditLogger.logClassification).toHaveBeenCalledWith(
        deadlineEmail.id,
        expect.objectContaining({
          signals: expect.objectContaining({
            is_deadline: true
          })
        })
      );
    });

    it('should detect HR sensitive content and apply appropriate signals', async () => {
      // Arrange
      const hrEmail = EmailGenerator.generateHRSensitive();
      mockOpenAIService.classify.mockResolvedValue({
        intent: 'hr',
        confidence: 0.94
      });

      // Act
      const result = await classifierAgent.classify(hrEmail);

      // Assert
      expect(result.signals.is_hr_sensitive).toBe(true);
      expect(result.department).toBe('hr');
      expect(mockAuditLogger.logClassification).toHaveBeenCalledWith(
        hrEmail.id,
        expect.objectContaining({
          signals: expect.objectContaining({
            is_hr_sensitive: true
          })
        })
      );
    });

    it('should detect legal risk indicators through signal analysis', async () => {
      // Arrange
      const legalEmail = EmailGenerator.generateLegalRisk();
      mockOpenAIService.classify.mockResolvedValue({
        intent: 'legal',
        confidence: 0.91
      });

      // Act
      const result = await classifierAgent.classify(legalEmail);

      // Assert
      expect(result.signals.is_legal_risk).toBe(true);
      expect(result.department).toBe('legal');
    });
  });

  describe('Configuration Integration', () => {
    it('should coordinate with configuration service for classification rules', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();
      mockConfigService.getClassificationRules.mockReturnValue({
        supportKeywords: ['bug', 'error', 'issue'],
        salesKeywords: ['purchase', 'buy', 'pricing']
      });

      // Act
      await classifierAgent.classify(email);

      // Assert - Verify configuration coordination
      expect(mockConfigService.getClassificationRules).toHaveBeenCalled();
      expect(mockOpenAIService.classify).toHaveBeenCalledWith(
        expect.objectContaining({
          rules: expect.any(Object)
        })
      );
    });

    it('should apply confidence thresholds from configuration', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();
      mockConfigService.getConfidenceThresholds.mockReturnValue({
        escalation: 0.65,
        rejection: 0.3
      });
      mockOpenAIService.classify.mockResolvedValue({
        intent: 'support',
        confidence: 0.6
      });

      // Act
      const result = await classifierAgent.classify(email);

      // Assert
      expect(mockConfigService.getConfidenceThresholds).toHaveBeenCalled();
      expect(result.status).toBe('needs_review'); // Below 0.65 threshold
    });
  });

  describe('Department Mapping Behavior', () => {
    it('should map support intent to support department correctly', async () => {
      // Arrange
      const supportEmail = EmailGenerator.generateSupport();
      mockOpenAIService.classify.mockResolvedValue({
        intent: 'support',
        confidence: 0.93
      });

      // Act
      const result = await classifierAgent.classify(supportEmail);

      // Assert
      expect(result.department).toBe('support');
      expect(result.intent).toBe('support');
    });

    it('should handle multi-intent scenarios with primary department selection', async () => {
      // Arrange
      const multiIntentEmail = EmailGenerator.generateMultiIntent();
      mockOpenAIService.classify.mockResolvedValue({
        intent: 'sales',
        confidence: 0.87,
        secondary_intents: ['support']
      });

      // Act
      const result = await classifierAgent.classify(multiIntentEmail);

      // Assert
      expect(result.intent).toBe('sales');
      expect(result.department).toBe('sales');
      expect(result.secondary_intents).toContain('support');
    });
  });

  describe('Audit Trail Compliance', () => {
    it('should maintain complete audit trail for all classifications', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();
      mockOpenAIService.classify.mockResolvedValue({
        intent: 'sales',
        confidence: 0.89
      });

      // Act
      await classifierAgent.classify(email);

      // Assert - Verify comprehensive audit logging
      expect(mockAuditLogger.logClassification).toHaveBeenCalledWith(
        email.id,
        expect.objectContaining({
          intent: 'sales',
          confidence: 0.89,
          timestamp: expect.any(String),
          agent: 'ClassifierAgent',
          version: expect.any(String)
        })
      );
    });

    it('should log processing time for performance monitoring', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();
      mockOpenAIService.classify.mockImplementation(async () => {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return { intent: 'support', confidence: 0.91 };
      });

      // Act
      await classifierAgent.classify(email);

      // Assert
      expect(mockAuditLogger.logClassification).toHaveBeenCalledWith(
        email.id,
        expect.objectContaining({
          processing_time_ms: expect.any(Number)
        })
      );
    });
  });

  describe('Contract Compliance', () => {
    it('should return classification result matching expected contract', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();
      mockOpenAIService.classify.mockResolvedValue({
        intent: 'support',
        confidence: 0.92
      });

      // Act
      const result = await classifierAgent.classify(email);

      // Assert - Verify contract compliance
      expect(result).toMatchContract({
        status: 'string',
        intent: 'string',
        department: 'string',
        confidence: 'number',
        secondary_intents: 'array',
        signals: 'object',
        reasoning: 'string'
      });
    });
  });
});