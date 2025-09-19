import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { EmailTriageSystem } from '../../src/system/email-triage-system';
import { PIIDetector } from '../../src/security/pii-detector';
import { EmailGenerator } from '../fixtures/email-generator';
import { SecurityTestHelper } from '../helpers/security-test-helper';
import { ComplianceValidator } from '../helpers/compliance-validator';

describe('PII Handling and Data Protection Security Tests', () => {
  let triageSystem: EmailTriageSystem;
  let piiDetector: PIIDetector;
  let securityHelper: SecurityTestHelper;
  let complianceValidator: ComplianceValidator;

  beforeAll(async () => {
    triageSystem = await createSecureTestSystem({
      encryption: true,
      piiDetection: true,
      auditLogging: true,
      gdprCompliance: true
    });

    piiDetector = new PIIDetector();
    securityHelper = new SecurityTestHelper();
    complianceValidator = new ComplianceValidator();

    await triageSystem.initialize();
  });

  afterAll(async () => {
    await triageSystem.shutdown();
    await securityHelper.cleanupTestData();
  });

  beforeEach(async () => {
    await triageSystem.resetSecurityState();
  });

  describe('PII Detection and Masking', () => {
    it('should detect and mask Social Security Numbers', async () => {
      // Arrange
      const emailWithSSN = EmailGenerator.generateRealistic({
        type: 'support',
        body: 'My SSN is 123-45-6789 and I need help with my account.'
      });

      // Act
      const result = await triageSystem.processEmail(emailWithSSN);

      // Assert
      expect(result.piiDetected).toBe(true);
      expect(result.piiTypes).toContain('ssn');
      expect(result.processedContent).not.toMatch(/\d{3}-\d{2}-\d{4}/);
      expect(result.processedContent).toMatch(/\[SSN_TOKEN_\w+\]/);
      expect(result.piiTokens).toHaveLength(1);
      expect(result.piiTokens[0]).toMatchObject({
        type: 'ssn',
        token: expect.stringMatching(/SSN_TOKEN_\w+/),
        originalHash: expect.any(String)
      });
    });

    it('should detect and mask credit card numbers', async () => {
      // Arrange
      const emailWithCC = EmailGenerator.generateRealistic({
        type: 'support',
        body: 'My credit card 4111-1111-1111-1111 was charged incorrectly.'
      });

      // Act
      const result = await triageSystem.processEmail(emailWithCC);

      // Assert
      expect(result.piiDetected).toBe(true);
      expect(result.piiTypes).toContain('credit_card');
      expect(result.processedContent).not.toMatch(/\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}/);
      expect(result.processedContent).toMatch(/\[CC_TOKEN_\w+\]/);
    });

    it('should detect and mask phone numbers', async () => {
      // Arrange
      const emailWithPhone = EmailGenerator.generateRealistic({
        type: 'support',
        body: 'Please call me at (555) 123-4567 or 555.987.6543 to discuss this issue.'
      });

      // Act
      const result = await triageSystem.processEmail(emailWithPhone);

      // Assert
      expect(result.piiDetected).toBe(true);
      expect(result.piiTypes).toContain('phone');
      expect(result.processedContent).not.toMatch(/\(\d{3}\)\s\d{3}-\d{4}/);
      expect(result.processedContent).not.toMatch(/\d{3}\.\d{3}\.\d{4}/);
      expect(result.piiTokens.filter(token => token.type === 'phone')).toHaveLength(2);
    });

    it('should detect and mask email addresses in content', async () => {
      // Arrange
      const emailWithEmails = EmailGenerator.generateRealistic({
        type: 'support',
        body: 'Forward this to john.doe@company.com and mary.smith@example.org for review.'
      });

      // Act
      const result = await triageSystem.processEmail(emailWithEmails);

      // Assert
      expect(result.piiDetected).toBe(true);
      expect(result.piiTypes).toContain('email');
      expect(result.processedContent).not.toContain('john.doe@company.com');
      expect(result.processedContent).not.toContain('mary.smith@example.org');
    });

    it('should detect and mask addresses', async () => {
      // Arrange
      const emailWithAddress = EmailGenerator.generateRealistic({
        type: 'support',
        body: 'Please send the documents to 123 Main Street, Apartment 4B, New York, NY 10001.'
      });

      // Act
      const result = await triageSystem.processEmail(emailWithAddress);

      // Assert
      expect(result.piiDetected).toBe(true);
      expect(result.piiTypes).toContain('address');
      expect(result.processedContent).toMatch(/\[ADDRESS_TOKEN_\w+\]/);
    });

    it('should handle multiple PII types in single email', async () => {
      // Arrange
      const emailWithMultiplePII = EmailGenerator.generateWithPII();

      // Act
      const result = await triageSystem.processEmail(emailWithMultiplePII);

      // Assert
      expect(result.piiDetected).toBe(true);
      expect(result.piiTypes.length).toBeGreaterThan(1);
      expect(result.piiTokens.length).toBeGreaterThan(1);

      // Verify all PII is masked
      const hasAnyUnmaskedPII = [
        /\d{3}-\d{2}-\d{4}/, // SSN
        /\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}/, // Credit card
        /\(\d{3}\)\s\d{3}-\d{4}/, // Phone
      ].some(pattern => pattern.test(result.processedContent));

      expect(hasAnyUnmaskedPII).toBe(false);
    });
  });

  describe('PII Token Management', () => {
    it('should securely store and retrieve PII tokens', async () => {
      // Arrange
      const emailWithPII = EmailGenerator.generateWithPII();

      // Act
      const result = await triageSystem.processEmail(emailWithPII);
      const tokenStorage = await triageSystem.getPIITokenStorage();

      // Assert
      expect(result.piiTokens).toBeDefined();
      result.piiTokens.forEach(async (tokenRef) => {
        const storedToken = await tokenStorage.retrieve(tokenRef.token);
        expect(storedToken).toBeDefined();
        expect(storedToken.encrypted).toBe(true);
        expect(storedToken.originalValue).not.toBeDefined(); // Should not store original
        expect(storedToken.hash).toBe(tokenRef.originalHash);
      });
    });

    it('should implement token expiration and cleanup', async () => {
      // Arrange
      const emailWithPII = EmailGenerator.generateWithPII();
      const shortExpirySystem = await createSecureTestSystem({
        piiTokenExpiry: 5000 // 5 seconds for testing
      });

      // Act
      const result = await shortExpirySystem.processEmail(emailWithPII);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 6000));
      await shortExpirySystem.cleanupExpiredTokens();

      const tokenStorage = await shortExpirySystem.getPIITokenStorage();

      // Assert
      for (const tokenRef of result.piiTokens) {
        const retrievedToken = await tokenStorage.retrieve(tokenRef.token);
        expect(retrievedToken).toBeNull(); // Should be expired and cleaned up
      }
    });

    it('should prevent token enumeration attacks', async () => {
      // Arrange
      const emails = Array.from({ length: 10 }, () => EmailGenerator.generateWithPII());
      const tokens = [];

      // Act
      for (const email of emails) {
        const result = await triageSystem.processEmail(email);
        tokens.push(...result.piiTokens.map(t => t.token));
      }

      // Assert - Verify tokens are not predictable
      const tokenSet = new Set(tokens);
      expect(tokenSet.size).toBe(tokens.length); // All tokens unique

      // Verify no sequential patterns
      const isSequential = tokens.every((token, index) => {
        if (index === 0) return true;
        return !token.includes((parseInt(tokens[index - 1].slice(-4), 36) + 1).toString(36));
      });
      expect(isSequential).toBe(true);
    });
  });

  describe('Access Control and Authorization', () => {
    it('should restrict PII access based on user roles', async () => {
      // Arrange
      const emailWithPII = EmailGenerator.generateWithPII();
      const result = await triageSystem.processEmail(emailWithPII);

      // Act & Assert - Different role access levels
      const unauthorizedAccess = triageSystem.retrievePII(
        result.piiTokens[0].token,
        { role: 'viewer', permissions: ['read'] }
      );
      await expect(unauthorizedAccess).rejects.toThrow('Insufficient permissions');

      const authorizedAccess = await triageSystem.retrievePII(
        result.piiTokens[0].token,
        { role: 'admin', permissions: ['read', 'pii_access'] }
      );
      expect(authorizedAccess).toBeDefined();
    });

    it('should log all PII access attempts', async () => {
      // Arrange
      const emailWithPII = EmailGenerator.generateWithPII();
      const result = await triageSystem.processEmail(emailWithPII);

      // Act
      await triageSystem.retrievePII(
        result.piiTokens[0].token,
        { role: 'admin', permissions: ['read', 'pii_access'], userId: 'admin-123' }
      );

      // Assert
      const auditLogs = await triageSystem.getAuditLogs({
        type: 'pii_access',
        timeRange: { start: new Date(Date.now() - 60000), end: new Date() }
      });

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0]).toMatchObject({
        action: 'pii_retrieve',
        userId: 'admin-123',
        tokenId: result.piiTokens[0].token,
        timestamp: expect.any(String),
        success: true
      });
    });

    it('should implement rate limiting for PII access', async () => {
      // Arrange
      const emailWithPII = EmailGenerator.generateWithPII();
      const result = await triageSystem.processEmail(emailWithPII);
      const token = result.piiTokens[0].token;
      const userCredentials = { role: 'admin', permissions: ['read', 'pii_access'], userId: 'admin-123' };

      // Act - Attempt rapid access
      const accessPromises = Array.from({ length: 20 }, () =>
        triageSystem.retrievePII(token, userCredentials)
      );

      const accessResults = await Promise.allSettled(accessPromises);

      // Assert
      const successful = accessResults.filter(r => r.status === 'fulfilled').length;
      const rateLimited = accessResults.filter(r =>
        r.status === 'rejected' && r.reason.message.includes('rate limit')
      ).length;

      expect(successful).toBeLessThan(20); // Some should be rate limited
      expect(rateLimited).toBeGreaterThan(0);
    });
  });

  describe('Encryption and Data Protection', () => {
    it('should encrypt PII data at rest', async () => {
      // Arrange
      const emailWithPII = EmailGenerator.generateWithPII();

      // Act
      const result = await triageSystem.processEmail(emailWithPII);
      const rawStorage = await triageSystem.getRawStorageAccess();

      // Assert
      for (const tokenRef of result.piiTokens) {
        const rawData = await rawStorage.get(tokenRef.token);
        expect(rawData.encrypted).toBe(true);
        expect(rawData.data).not.toContain('123-45-6789'); // Original SSN
        expect(rawData.data).not.toContain('4111-1111-1111-1111'); // Original CC

        // Verify encryption format
        expect(rawData.data).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 encrypted
      }
    });

    it('should use different encryption keys for different PII types', async () => {
      // Arrange
      const emailWithMultiplePII = EmailGenerator.generateWithPII();

      // Act
      const result = await triageSystem.processEmail(emailWithMultiplePII);
      const encryptionService = await triageSystem.getEncryptionService();

      // Assert
      const ssnToken = result.piiTokens.find(t => t.type === 'ssn');
      const ccToken = result.piiTokens.find(t => t.type === 'credit_card');

      if (ssnToken && ccToken) {
        const ssnKeyId = await encryptionService.getKeyId(ssnToken.token);
        const ccKeyId = await encryptionService.getKeyId(ccToken.token);

        expect(ssnKeyId).not.toBe(ccKeyId); // Different keys for different PII types
      }
    });

    it('should implement key rotation for PII encryption', async () => {
      // Arrange
      const emailWithPII = EmailGenerator.generateWithPII();
      const result = await triageSystem.processEmail(emailWithPII);
      const originalToken = result.piiTokens[0];

      // Act - Trigger key rotation
      await triageSystem.rotateEncryptionKeys();

      // Process new email with same type of PII
      const newEmailWithPII = EmailGenerator.generateWithPII();
      const newResult = await triageSystem.processEmail(newEmailWithPII);
      const newToken = newResult.piiTokens[0];

      // Assert
      const encryptionService = await triageSystem.getEncryptionService();
      const originalKeyId = await encryptionService.getKeyId(originalToken.token);
      const newKeyId = await encryptionService.getKeyId(newToken.token);

      expect(originalKeyId).not.toBe(newKeyId); // New key used after rotation

      // Original token should still be accessible (backward compatibility)
      const retrievedOriginal = await triageSystem.retrievePII(
        originalToken.token,
        { role: 'admin', permissions: ['read', 'pii_access'] }
      );
      expect(retrievedOriginal).toBeDefined();
    });
  });

  describe('GDPR and Privacy Compliance', () => {
    it('should support right to be forgotten (data erasure)', async () => {
      // Arrange
      const userEmail = 'user@example.com';
      const emailsFromUser = Array.from({ length: 5 }, () =>
        EmailGenerator.generateRealistic({
          from: userEmail,
          body: 'My SSN is 123-45-6789 for verification.'
        })
      );

      const results = await Promise.all(
        emailsFromUser.map(email => triageSystem.processEmail(email))
      );

      // Act - Request data erasure
      const erasureResult = await triageSystem.eraseUserData(userEmail);

      // Assert
      expect(erasureResult.success).toBe(true);
      expect(erasureResult.itemsErased).toBeGreaterThan(0);

      // Verify PII tokens are no longer accessible
      for (const result of results) {
        for (const tokenRef of result.piiTokens) {
          const retrievalAttempt = triageSystem.retrievePII(
            tokenRef.token,
            { role: 'admin', permissions: ['read', 'pii_access'] }
          );
          await expect(retrievalAttempt).rejects.toThrow('Token not found or expired');
        }
      }
    });

    it('should support data portability (export user data)', async () => {
      // Arrange
      const userEmail = 'user@example.com';
      const emailsFromUser = Array.from({ length: 3 }, () =>
        EmailGenerator.generateRealistic({ from: userEmail })
      );

      await Promise.all(
        emailsFromUser.map(email => triageSystem.processEmail(email))
      );

      // Act
      const exportResult = await triageSystem.exportUserData(userEmail);

      // Assert
      expect(exportResult.success).toBe(true);
      expect(exportResult.data.emails).toHaveLength(3);
      expect(exportResult.data.piiProcessed).toBeDefined();
      expect(exportResult.data.auditTrail).toBeDefined();

      // Verify export format compliance
      expect(exportResult.format).toBe('json');
      expect(exportResult.data.exportDate).toBeDefined();
      expect(exportResult.data.dataSubject).toBe(userEmail);
    });

    it('should implement data retention policies', async () => {
      // Arrange
      const retentionSystem = await createSecureTestSystem({
        dataRetention: {
          emails: '30d',
          piiTokens: '7d',
          auditLogs: '1y'
        }
      });

      const oldEmail = EmailGenerator.generateWithPII();
      oldEmail.timestamp = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(); // 35 days ago

      // Act
      await retentionSystem.processEmail(oldEmail);
      await retentionSystem.applyRetentionPolicies();

      // Assert
      const emailExists = await retentionSystem.emailExists(oldEmail.id);
      expect(emailExists).toBe(false); // Should be deleted by retention policy
    });
  });

  describe('Security Monitoring and Alerting', () => {
    it('should detect suspicious PII access patterns', async () => {
      // Arrange
      const emailWithPII = EmailGenerator.generateWithPII();
      const result = await triageSystem.processEmail(emailWithPII);
      const securityMonitor = await triageSystem.getSecurityMonitor();

      // Act - Simulate suspicious access pattern
      const suspiciousUser = { role: 'user', permissions: ['read'], userId: 'suspicious-user' };

      // Multiple rapid access attempts
      for (let i = 0; i < 10; i++) {
        try {
          await triageSystem.retrievePII(result.piiTokens[0].token, suspiciousUser);
        } catch (error) {
          // Expected - user doesn't have permission
        }
      }

      // Assert
      const alerts = await securityMonitor.getRecentAlerts();
      const suspiciousAlert = alerts.find(alert =>
        alert.type === 'suspicious_pii_access' &&
        alert.userId === 'suspicious-user'
      );

      expect(suspiciousAlert).toBeDefined();
      expect(suspiciousAlert.severity).toBe('high');
    });

    it('should alert on PII data breaches', async () => {
      // Arrange
      const emailWithPII = EmailGenerator.generateWithPII();
      await triageSystem.processEmail(emailWithPII);

      // Act - Simulate data breach detection
      await triageSystem.simulateSecurityIncident('pii_exposure', {
        affectedTokens: 5,
        exposureType: 'unauthorized_access'
      });

      // Assert
      const incidents = await triageSystem.getSecurityIncidents();
      const breachIncident = incidents.find(incident =>
        incident.type === 'pii_exposure'
      );

      expect(breachIncident).toBeDefined();
      expect(breachIncident.severity).toBe('critical');
      expect(breachIncident.mitigationActions).toContain('rotate_tokens');
      expect(breachIncident.notificationSent).toBe(true);
    });
  });

  // Helper function
  async function createSecureTestSystem(options: any) {
    // Implementation would create a security-focused test system
    return new EmailTriageSystem({
      security: true,
      ...options
    });
  }
});