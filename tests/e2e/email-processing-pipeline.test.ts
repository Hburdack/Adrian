import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { EmailTriageSystem } from '../../src/system/email-triage-system';
import { TestSystemBuilder } from '../helpers/test-system-builder';
import { EmailGenerator } from '../fixtures/email-generator';
import { MetricsCollector } from '../helpers/metrics-collector';
import { AcceptanceCriteriaValidator } from '../helpers/acceptance-criteria-validator';

describe('Email Processing Pipeline - End-to-End Tests', () => {
  let triageSystem: EmailTriageSystem;
  let metricsCollector: MetricsCollector;
  let criteriaValidator: AcceptanceCriteriaValidator;

  beforeAll(async () => {
    // Setup complete test system with real-like environment
    triageSystem = await TestSystemBuilder
      .create()
      .withMockedExternalServices()
      .withRealAgentOrchestration()
      .withTestDatabase()
      .withMonitoring()
      .build();

    metricsCollector = new MetricsCollector();
    criteriaValidator = new AcceptanceCriteriaValidator();

    await triageSystem.initialize();
  });

  afterAll(async () => {
    await triageSystem.shutdown();
    await metricsCollector.exportMetrics();
  });

  beforeEach(async () => {
    await triageSystem.reset();
    metricsCollector.startCollection();
  });

  describe('Complete Email Processing Workflow', () => {
    it('should process support email end-to-end within SLA', async () => {
      // Arrange
      const supportEmail = EmailGenerator.generateRealistic({
        type: 'support',
        subject: 'Unable to access my account dashboard',
        body: `Hi support team,

               I've been trying to log into my account for the past hour but keep getting
               an error message "Invalid credentials" even though I'm sure my password is correct.
               I reset it twice already but still can't get in.

               This is urgent as I need to review my billing information before our meeting tomorrow.

               Account email: john.doe@example.com
               Browser: Chrome 118

               Please help!

               Best regards,
               John Doe`,
        from: 'john.doe@example.com',
        timestamp: new Date().toISOString()
      });

      const startTime = Date.now();

      // Act
      const result = await triageSystem.processEmail(supportEmail);
      const processingTime = Date.now() - startTime;

      // Assert - Verify end-to-end behavior
      expect(result).toMatchObject({
        status: 'completed',
        emailId: supportEmail.id,
        routedTo: 'support@company.com',
        classification: {
          intent: 'support',
          department: 'support',
          confidence: expect.any(Number)
        },
        urgency: {
          level: expect.stringMatching(/normal|urgent/),
          sla: expect.objectContaining({
            deadline: expect.any(String),
            hours: expect.any(Number)
          })
        },
        contextNote: expect.stringContaining('Account access issue'),
        auditTrail: expect.arrayContaining([
          expect.objectContaining({ agent: 'ClassifierAgent' }),
          expect.objectContaining({ agent: 'UrgencyAgent' }),
          expect.objectContaining({ agent: 'RetrieverAgent' }),
          expect.objectContaining({ agent: 'RouterAgent' })
        ])
      });

      // Verify SLA compliance
      expect(processingTime).toBeLessThan(30000); // 30 seconds max
      expect(result.classification.confidence).toBeGreaterThan(0.8);
      expect(result.urgency.sla.hours).toBeLessThanOrEqual(4);

      // Verify PII handling
      expect(result.processedContent).not.toContain('john.doe@example.com');
      expect(result.piiMasked).toBe(true);
    });

    it('should process sales inquiry with proper lead scoring', async () => {
      // Arrange
      const salesEmail = EmailGenerator.generateRealistic({
        type: 'sales',
        subject: 'Enterprise license pricing for 500+ users',
        body: `Hello,

               We are a Fortune 500 company evaluating solutions for our customer service team.
               We need to support approximately 500 concurrent users across 15 locations.

               Key requirements:
               - SSO integration with Azure AD
               - API access for custom integrations
               - 24/7 enterprise support
               - Data residency in EU

               What would be the annual pricing for this setup? We're looking to make a decision
               by end of Q1 2024.

               Revenue: $2.5B annually
               Current tools: Salesforce, ServiceNow

               Please schedule a call this week if possible.

               Best regards,
               Sarah Johnson
               CTO, MegaCorp Industries`,
        from: 'sarah.johnson@megacorp.com',
        timestamp: new Date().toISOString()
      });

      // Act
      const result = await triageSystem.processEmail(salesEmail);

      // Assert
      expect(result.classification.intent).toBe('sales');
      expect(result.routedTo).toBe('sales@company.com');
      expect(result.contextNote).toContain('Enterprise inquiry');
      expect(result.contextNote).toContain('500 users');
      expect(result.urgency.level).toBe('normal');
      expect(result.leadScore).toBeGreaterThan(80); // High-value lead
    });

    it('should handle urgent HR issue with proper escalation', async () => {
      // Arrange
      const hrEmail = EmailGenerator.generateRealistic({
        type: 'hr',
        subject: 'URGENT: Workplace harassment complaint',
        body: `This is a confidential and urgent matter regarding workplace harassment.

               I need to report an incident that occurred yesterday involving my direct manager.
               This requires immediate attention from HR leadership.

               I am requesting a formal investigation be initiated.

               Employee ID: EMP-12345
               Department: Engineering

               Please contact me immediately at my personal phone: (555) 123-4567

               This matter is time-sensitive and confidential.`,
        from: 'employee.confidential@company.com',
        timestamp: new Date().toISOString()
      });

      // Act
      const result = await triageSystem.processEmail(hrEmail);

      // Assert
      expect(result.classification.intent).toBe('hr');
      expect(result.classification.signals.is_hr_sensitive).toBe(true);
      expect(result.urgency.level).toBe('urgent');
      expect(result.urgency.sla.hours).toBeLessThanOrEqual(1);
      expect(result.routedTo).toBe('hr-leadership@company.com');
      expect(result.confidential).toBe(true);
      expect(result.piiMasked).toBe(true);
    });

    it('should detect and handle spam/phishing attempts', async () => {
      // Arrange
      const suspiciousEmail = EmailGenerator.generateRealistic({
        type: 'spam',
        subject: 'URGENT: Your account will be suspended - Click here NOW!',
        body: `Dear customer,

               Your account has been flagged for suspicious activity. You have 24 hours
               to verify your identity or your account will be permanently suspended.

               Click here to verify: http://suspicious-link.com/verify-now

               Please provide:
               - Full name
               - Social Security Number
               - Credit card information
               - Mother's maiden name

               Act fast! Time is running out!

               Urgent Security Team`,
        from: 'security.urgent@fake-domain.com',
        timestamp: new Date().toISOString()
      });

      // Act
      const result = await triageSystem.processEmail(suspiciousEmail);

      // Assert
      expect(result.classification.intent).toBe('spam');
      expect(result.routedTo).toBe('security@company.com');
      expect(result.blocked).toBe(true);
      expect(result.threatLevel).toBe('high');
      expect(result.quarantined).toBe(true);
    });
  });

  describe('High-Volume Processing', () => {
    it('should maintain performance under peak load', async () => {
      // Arrange
      const emails = Array.from({ length: 100 }, (_, i) =>
        EmailGenerator.generateRealistic({
          type: ['support', 'sales', 'hr', 'general'][i % 4],
          sequenceNumber: i
        })
      );

      const startTime = Date.now();

      // Act
      const results = await Promise.all(
        emails.map(email => triageSystem.processEmail(email))
      );

      const totalTime = Date.now() - startTime;
      const avgProcessingTime = totalTime / emails.length;

      // Assert
      expect(results).toHaveLength(100);
      expect(avgProcessingTime).toBeLessThan(5000); // 5 seconds average
      expect(results.filter(r => r.status === 'completed')).toHaveLength(100);

      // Verify no degradation in accuracy
      const accurateResults = results.filter(r => r.classification.confidence > 0.8);
      expect(accurateResults.length / results.length).toBeGreaterThan(0.9);
    });

    it('should handle concurrent processing without conflicts', async () => {
      // Arrange
      const concurrentEmails = Array.from({ length: 50 }, () =>
        EmailGenerator.generateRealistic({ type: 'support' })
      );

      // Act
      const promises = concurrentEmails.map(email =>
        triageSystem.processEmail(email)
      );
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(50);

      // Verify no race conditions or duplicate processing
      const emailIds = results.map(r => r.emailId);
      const uniqueIds = new Set(emailIds);
      expect(uniqueIds.size).toBe(50);

      // Verify consistent routing
      const supportRoutings = results.filter(r => r.routedTo === 'support@company.com');
      expect(supportRoutings.length).toBe(50);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should recover from external service failures', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();

      // Simulate OpenAI service failure
      await triageSystem.simulateServiceFailure('openai', { duration: 5000 });

      // Act
      const result = await triageSystem.processEmail(email);

      // Assert
      expect(result.status).toBe('completed');
      expect(result.fallbackUsed).toBe(true);
      expect(result.classification.confidence).toBeGreaterThan(0.6);
    });

    it('should handle corrupted email data gracefully', async () => {
      // Arrange
      const corruptedEmail = {
        id: 'corrupt-123',
        from: null,
        subject: '',
        body_text: undefined,
        attachments: ['invalid-data'],
        timestamp: 'invalid-date'
      };

      // Act
      const result = await triageSystem.processEmail(corruptedEmail as any);

      // Assert
      expect(result.status).toBe('error');
      expect(result.errorType).toBe('invalid_email_format');
      expect(result.humanReviewRequired).toBe(true);
    });
  });

  describe('Security and Compliance', () => {
    it('should detect and protect PII in all email types', async () => {
      // Arrange
      const emailWithPII = EmailGenerator.generateWithPII();

      // Act
      const result = await triageSystem.processEmail(emailWithPII);

      // Assert
      expect(result.piiDetected).toBe(true);
      expect(result.piiMasked).toBe(true);
      expect(result.processedContent).not.toMatch(/\d{3}-\d{2}-\d{4}/); // SSN pattern
      expect(result.processedContent).not.toMatch(/\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}/); // Credit card
      expect(result.piiTokens).toHaveLength(expect.any(Number));
    });

    it('should maintain audit trail integrity', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();

      // Act
      const result = await triageSystem.processEmail(email);

      // Assert
      expect(result.auditTrail).toBeDefined();
      expect(result.auditTrail.length).toBeGreaterThan(0);

      // Verify audit trail completeness
      const expectedAgents = ['ClassifierAgent', 'UrgencyAgent', 'RetrieverAgent', 'RouterAgent'];
      expectedAgents.forEach(agent => {
        expect(result.auditTrail.some(entry => entry.agent === agent)).toBe(true);
      });

      // Verify immutable audit records
      expect(result.auditTrail.every(entry => entry.hash)).toBe(true);
    });
  });

  describe('Acceptance Criteria Validation', () => {
    it('should achieve >90% routing accuracy on test dataset', async () => {
      // Arrange
      const testDataset = await EmailGenerator.loadTestDataset(1000);

      // Act
      const results = await Promise.all(
        testDataset.map(email => triageSystem.processEmail(email))
      );

      // Assert
      const accuracy = criteriaValidator.calculateRoutingAccuracy(results, testDataset);
      expect(accuracy).toBeGreaterThan(0.90);
    });

    it('should meet SLA requirements for all urgency levels', async () => {
      // Arrange
      const urgentEmails = Array.from({ length: 100 }, () =>
        EmailGenerator.generateUrgent()
      );
      const routineEmails = Array.from({ length: 100 }, () =>
        EmailGenerator.generateRoutine()
      );

      // Act
      const urgentResults = await Promise.all(
        urgentEmails.map(email => triageSystem.processEmail(email))
      );
      const routineResults = await Promise.all(
        routineEmails.map(email => triageSystem.processEmail(email))
      );

      // Assert
      const urgentSLACompliance = criteriaValidator.validateSLACompliance(urgentResults, 'urgent');
      const routineSLACompliance = criteriaValidator.validateSLACompliance(routineResults, 'routine');

      expect(urgentSLACompliance.averageTime).toBeLessThan(3600000); // 1 hour
      expect(routineSLACompliance.averageTime).toBeLessThan(14400000); // 4 hours
      expect(urgentSLACompliance.complianceRate).toBeGreaterThan(0.95);
      expect(routineSLACompliance.complianceRate).toBeGreaterThan(0.95);
    });

    it('should maintain <5% escalation rate', async () => {
      // Arrange
      const mixedEmails = Array.from({ length: 1000 }, () =>
        EmailGenerator.generateMixed()
      );

      // Act
      const results = await Promise.all(
        mixedEmails.map(email => triageSystem.processEmail(email))
      );

      // Assert
      const escalationRate = results.filter(r => r.humanReviewRequired).length / results.length;
      expect(escalationRate).toBeLessThan(0.05);
    });

    it('should maintain <2% misrouting rate', async () => {
      // Arrange
      const labeledEmails = await EmailGenerator.loadLabeledTestSet(500);

      // Act
      const results = await Promise.all(
        labeledEmails.map(email => triageSystem.processEmail(email))
      );

      // Assert
      const misroutingRate = criteriaValidator.calculateMisroutingRate(results, labeledEmails);
      expect(misroutingRate).toBeLessThan(0.02);
    });
  });

  describe('System Integration', () => {
    it('should integrate properly with CRM system', async () => {
      // Arrange
      const customerEmail = EmailGenerator.generateFromKnownCustomer();

      // Act
      const result = await triageSystem.processEmail(customerEmail);

      // Assert
      expect(result.customerContext).toBeDefined();
      expect(result.customerContext.tier).toBeDefined();
      expect(result.customerContext.history).toBeDefined();
      expect(result.contextNote).toContain(result.customerContext.tier);
    });

    it('should integrate with ticketing system for context', async () => {
      // Arrange
      const followUpEmail = EmailGenerator.generateFollowUp();

      // Act
      const result = await triageSystem.processEmail(followUpEmail);

      // Assert
      expect(result.relatedTickets).toBeDefined();
      expect(result.contextNote).toContain('Related to ticket');
    });
  });
});