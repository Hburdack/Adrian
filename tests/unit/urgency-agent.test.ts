import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UrgencyAgent } from '../../src/agents/urgency-agent';
import { createSLAServiceMock, createDateServiceMock, createAuditLoggerMock } from '../mocks/service-mocks';
import { EmailGenerator } from '../fixtures/email-generator';

describe('UrgencyAgent - London School TDD', () => {
  let urgencyAgent: UrgencyAgent;
  let mockSLAService: any;
  let mockDateService: any;
  let mockAuditLogger: any;

  beforeEach(() => {
    // Arrange - Create mocks with behavior verification focus
    mockSLAService = createSLAServiceMock();
    mockDateService = createDateServiceMock();
    mockAuditLogger = createAuditLoggerMock();

    urgencyAgent = new UrgencyAgent(
      mockSLAService,
      mockDateService,
      mockAuditLogger
    );
  });

  describe('Urgency Assessment Coordination', () => {
    it('should coordinate urgency detection with SLA calculation workflow', async () => {
      // Arrange
      const urgentEmail = EmailGenerator.generateUrgent();
      const classification = { intent: 'support', confidence: 0.9 };
      const currentTime = new Date('2023-01-01T09:00:00Z');

      mockDateService.getCurrentTime.mockReturnValue(currentTime);
      mockSLAService.getSLAForUrgency.mockReturnValue({ hours: 1, priority: 'urgent' });
      mockSLAService.calculateDeadline.mockReturnValue(new Date('2023-01-01T10:00:00Z'));

      // Act
      const result = await urgencyAgent.assessUrgency(urgentEmail, classification);

      // Assert - Verify collaboration sequence
      expect(mockDateService.getCurrentTime).toHaveBeenCalledBefore(mockSLAService.getSLAForUrgency);
      expect(mockSLAService.getSLAForUrgency).toHaveBeenCalledWith('urgent');
      expect(mockSLAService.calculateDeadline).toHaveBeenCalledWith(
        currentTime,
        { hours: 1, priority: 'urgent' }
      );

      expect(mockAuditLogger.logUrgencyAssessment).toHaveBeenCalledWith(
        urgentEmail.id,
        expect.objectContaining({
          urgency: 'urgent',
          sla_deadline: new Date('2023-01-01T10:00:00Z')
        })
      );
    });

    it('should detect keyword-based urgency and coordinate with SLA mapping', async () => {
      // Arrange
      const criticalEmail = EmailGenerator.generateCritical();
      const classification = { intent: 'support', confidence: 0.95 };

      mockSLAService.getSLAForUrgency.mockReturnValue({ hours: 0.5, priority: 'critical' });

      // Act
      const result = await urgencyAgent.assessUrgency(criticalEmail, classification);

      // Assert
      expect(result.urgency).toBe('urgent');
      expect(mockSLAService.getSLAForUrgency).toHaveBeenCalledWith('urgent');
      expect(result.sla.hours).toBe(0.5);
    });

    it('should coordinate business hours calculation with SLA service', async () => {
      // Arrange
      const routineEmail = EmailGenerator.generateRoutine();
      const classification = { intent: 'sales', confidence: 0.88 };
      const fridayEvening = new Date('2023-01-06T18:00:00Z'); // Friday 6 PM

      mockDateService.getCurrentTime.mockReturnValue(fridayEvening);
      mockDateService.parseBusinessHours.mockReturnValue({
        start: 9, end: 17, weekdays: [1,2,3,4,5]
      });
      mockSLAService.calculateDeadline.mockReturnValue(new Date('2023-01-09T13:00:00Z')); // Monday 1 PM

      // Act
      const result = await urgencyAgent.assessUrgency(routineEmail, classification);

      // Assert - Verify business hours coordination
      expect(mockDateService.parseBusinessHours).toHaveBeenCalled();
      expect(mockSLAService.calculateDeadline).toHaveBeenCalledWith(
        fridayEvening,
        expect.objectContaining({ businessHours: expect.any(Object) })
      );
    });
  });

  describe('Deadline Detection Behavior', () => {
    it('should parse explicit deadlines and coordinate with SLA override', async () => {
      // Arrange
      const deadlineEmail = EmailGenerator.generateWithExplicitDeadline();
      const classification = { intent: 'sales', confidence: 0.91 };

      mockDateService.parseDeadlineFromText.mockReturnValue(new Date('2023-01-02T17:00:00Z'));
      mockSLAService.shouldOverrideSLA.mockReturnValue(true);

      // Act
      const result = await urgencyAgent.assessUrgency(deadlineEmail, classification);

      // Assert
      expect(mockDateService.parseDeadlineFromText).toHaveBeenCalledWith(deadlineEmail.body_text);
      expect(mockSLAService.shouldOverrideSLA).toHaveBeenCalledWith(
        expect.any(Date), // explicit deadline
        expect.any(Object) // standard SLA
      );
      expect(result.deadline_override).toBe(true);
    });

    it('should handle ambiguous deadline language through verification workflow', async () => {
      // Arrange
      const ambiguousEmail = EmailGenerator.generateWithAmbiguousDeadline();
      const classification = { intent: 'support', confidence: 0.87 };

      mockDateService.parseDeadlineFromText.mockReturnValue(null);
      mockSLAService.estimateUrgencyFromContent.mockReturnValue('normal');

      // Act
      const result = await urgencyAgent.assessUrgency(ambiguousEmail, classification);

      // Assert
      expect(mockDateService.parseDeadlineFromText).toHaveBeenCalled();
      expect(mockSLAService.estimateUrgencyFromContent).toHaveBeenCalledWith(
        ambiguousEmail.body_text
      );
      expect(result.urgency).toBe('normal');
    });
  });

  describe('Classification Integration', () => {
    it('should coordinate urgency with classification confidence scores', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();
      const lowConfidenceClassification = { intent: 'support', confidence: 0.6 };

      mockSLAService.adjustUrgencyForConfidence.mockReturnValue('normal');

      // Act
      const result = await urgencyAgent.assessUrgency(email, lowConfidenceClassification);

      // Assert
      expect(mockSLAService.adjustUrgencyForConfidence).toHaveBeenCalledWith(
        expect.any(String), // initial urgency
        0.6 // confidence score
      );
      expect(result.confidence_adjusted).toBe(true);
    });

    it('should escalate urgency based on intent-specific rules', async () => {
      // Arrange
      const securityEmail = EmailGenerator.generateSecurity();
      const securityClassification = { intent: 'security', confidence: 0.94 };

      mockSLAService.getIntentSpecificRules.mockReturnValue({
        'security': { autoEscalate: true, urgency: 'urgent' }
      });

      // Act
      const result = await urgencyAgent.assessUrgency(securityEmail, securityClassification);

      // Assert
      expect(mockSLAService.getIntentSpecificRules).toHaveBeenCalledWith('security');
      expect(result.urgency).toBe('urgent');
      expect(result.auto_escalated).toBe(true);
    });
  });

  describe('SLA Compliance Workflow', () => {
    it('should calculate SLA deadlines with proper timezone coordination', async () => {
      // Arrange
      const internationalEmail = EmailGenerator.generateInternational();
      const classification = { intent: 'support', confidence: 0.89 };

      mockDateService.detectTimezone.mockReturnValue('Europe/London');
      mockSLAService.getSLAForTimezone.mockReturnValue({ hours: 4, timezone: 'Europe/London' });

      // Act
      await urgencyAgent.assessUrgency(internationalEmail, classification);

      // Assert
      expect(mockDateService.detectTimezone).toHaveBeenCalledWith(internationalEmail.from);
      expect(mockSLAService.getSLAForTimezone).toHaveBeenCalledWith(
        'normal',
        'Europe/London'
      );
    });

    it('should handle SLA exceptions through escalation workflow', async () => {
      // Arrange
      const vipEmail = EmailGenerator.generateVIP();
      const classification = { intent: 'sales', confidence: 0.92 };

      mockSLAService.checkForExceptions.mockReturnValue({
        hasException: true,
        type: 'vip_customer',
        urgency: 'urgent'
      });

      // Act
      const result = await urgencyAgent.assessUrgency(vipEmail, classification);

      // Assert
      expect(mockSLAService.checkForExceptions).toHaveBeenCalledWith(vipEmail.from);
      expect(result.urgency).toBe('urgent');
      expect(result.exception_applied).toBe('vip_customer');
    });
  });

  describe('Error Handling Coordination', () => {
    it('should handle SLA service failures with fallback workflow', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();
      const classification = { intent: 'support', confidence: 0.85 };

      mockSLAService.getSLAForUrgency.mockRejectedValue(new Error('SLA service unavailable'));
      mockSLAService.getDefaultSLA.mockReturnValue({ hours: 4, priority: 'normal' });

      // Act
      const result = await urgencyAgent.assessUrgency(email, classification);

      // Assert
      expect(mockSLAService.getDefaultSLA).toHaveBeenCalled();
      expect(mockAuditLogger.logError).toHaveBeenCalledWith(
        email.id,
        expect.objectContaining({
          error: 'SLA service unavailable',
          fallback_used: true
        })
      );
      expect(result.sla.hours).toBe(4);
    });

    it('should validate date service responses and handle invalid dates', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();
      const classification = { intent: 'support', confidence: 0.88 };

      mockDateService.getCurrentTime.mockReturnValue(new Date('invalid'));
      mockDateService.getSystemTime.mockReturnValue(new Date('2023-01-01T12:00:00Z'));

      // Act
      const result = await urgencyAgent.assessUrgency(email, classification);

      // Assert
      expect(mockDateService.getSystemTime).toHaveBeenCalled();
      expect(mockAuditLogger.logError).toHaveBeenCalledWith(
        email.id,
        expect.objectContaining({
          error: 'Invalid date from date service',
          fallback_used: true
        })
      );
    });
  });

  describe('Performance Monitoring', () => {
    it('should track urgency assessment timing for SLA compliance', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();
      const classification = { intent: 'support', confidence: 0.90 };

      const startTime = Date.now();
      mockDateService.getCurrentTime.mockReturnValue(new Date(startTime));

      // Act
      await urgencyAgent.assessUrgency(email, classification);

      // Assert
      expect(mockAuditLogger.logUrgencyAssessment).toHaveBeenCalledWith(
        email.id,
        expect.objectContaining({
          assessment_time_ms: expect.any(Number)
        })
      );
    });
  });

  describe('Contract Compliance', () => {
    it('should return urgency assessment matching expected contract', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();
      const classification = { intent: 'support', confidence: 0.89 };

      mockSLAService.getSLAForUrgency.mockReturnValue({ hours: 4 });
      mockDateService.getCurrentTime.mockReturnValue(new Date());

      // Act
      const result = await urgencyAgent.assessUrgency(email, classification);

      // Assert
      expect(result).toMatchContract({
        urgency: 'string',
        sla: 'object',
        deadline: 'string',
        reasoning: 'string',
        confidence: 'number'
      });
    });
  });
});