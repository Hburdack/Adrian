# Zetify Email Triage System - TDD Test Strategy (London School)

## Overview

This document outlines a comprehensive Test-Driven Development strategy for the Zetify email triage system using the London School (mockist) approach. We focus on outside-in development, behavior verification, and mock-driven design to ensure high-quality, well-tested agent interactions.

## London School TDD Principles Applied

### 1. Outside-In Development
- Start with acceptance tests defining user behavior
- Drive implementation from system boundaries inward
- Use mocks to define contracts between collaborating objects
- Focus on object interactions rather than state verification

### 2. Mock-Driven Design
- Define clear interfaces through mock expectations
- Isolate units under test completely
- Verify behavior through interaction testing
- Use dependency injection for testability

### 3. Behavior Verification
- Test how objects collaborate, not what they contain
- Verify method calls, parameter passing, and interaction sequences
- Focus on protocol compliance and contract adherence
- Ensure proper error handling and edge case behavior

## Test Architecture

### Test Pyramid Structure

```
                    E2E Tests (5%)
                 ┌─────────────────┐
                 │  Full Pipeline  │
                 │  Real Emails    │
                 │  Live Services  │
                 └─────────────────┘

              Integration Tests (15%)
            ┌─────────────────────────┐
            │   Agent Orchestration   │
            │   Workflow Testing      │
            │   Contract Verification │
            └─────────────────────────┘

          Unit Tests (80%)
    ┌─────────────────────────────────┐
    │        Individual Agents        │
    │      Mock Collaborations        │
    │     Behavior Verification       │
    └─────────────────────────────────┘
```

## 1. Unit Test Strategy

### 1.1 ClassifierAgent Tests

**Test Scope**: Email intent classification and department routing

#### Mock Dependencies
```typescript
// Mock external services and collaborators
const mockOpenAIService = {
  classify: jest.fn(),
  generateEmbedding: jest.fn()
};

const mockConfigurationService = {
  getClassificationRules: jest.fn(),
  getConfidenceThresholds: jest.fn()
};

const mockAuditLogger = {
  logClassification: jest.fn(),
  logError: jest.fn()
};
```

#### Key Test Scenarios
```typescript
describe('ClassifierAgent - London School TDD', () => {
  describe('Intent Classification', () => {
    it('should classify support email and log decision', async () => {
      // Arrange
      const email = createTestEmail({ subject: 'Bug in login system' });
      mockOpenAIService.classify.mockResolvedValue({
        intent: 'support',
        confidence: 0.92
      });

      // Act
      const result = await classifierAgent.classify(email);

      // Assert - Verify interactions
      expect(mockOpenAIService.classify).toHaveBeenCalledWith(
        expect.objectContaining({
          text: email.body_text,
          subject: email.subject
        })
      );
      expect(mockAuditLogger.logClassification).toHaveBeenCalledWith(
        email.id,
        result
      );
      expect(result.intent).toBe('support');
    });

    it('should escalate low-confidence classifications', async () => {
      // Arrange
      const ambiguousEmail = createTestEmail({
        subject: 'Important discussion needed'
      });
      mockOpenAIService.classify.mockResolvedValue({
        intent: 'other',
        confidence: 0.45
      });

      // Act
      const result = await classifierAgent.classify(ambiguousEmail);

      // Assert - Verify escalation behavior
      expect(result.status).toBe('needs_review');
      expect(mockAuditLogger.logClassification).toHaveBeenCalledWith(
        ambiguousEmail.id,
        expect.objectContaining({ status: 'needs_review' })
      );
    });
  });

  describe('Signal Detection', () => {
    it('should detect deadline signals and mark appropriately', async () => {
      // Test deadline detection behavior
      const urgentEmail = createTestEmail({
        body_text: 'Please respond by Friday EOD for contract renewal'
      });

      const result = await classifierAgent.classify(urgentEmail);

      expect(result.signals.is_deadline).toBe(true);
      expect(mockAuditLogger.logClassification).toHaveBeenCalledWith(
        urgentEmail.id,
        expect.objectContaining({
          signals: expect.objectContaining({ is_deadline: true })
        })
      );
    });
  });
});
```

### 1.2 UrgencyAgent Tests

**Test Scope**: Urgency classification and SLA mapping

#### Mock Dependencies
```typescript
const mockSLAService = {
  getSLAForUrgency: jest.fn(),
  calculateDeadline: jest.fn()
};

const mockDateService = {
  getCurrentTime: jest.fn(),
  parseBusinessHours: jest.fn()
};
```

#### Key Test Scenarios
```typescript
describe('UrgencyAgent - Behavior Verification', () => {
  it('should coordinate urgency detection with SLA calculation', async () => {
    // Arrange
    const email = createTestEmail({ subject: 'URGENT: System down' });
    mockSLAService.getSLAForUrgency.mockReturnValue({ hours: 1 });
    mockDateService.getCurrentTime.mockReturnValue(new Date('2023-01-01T09:00:00Z'));

    // Act
    await urgencyAgent.assessUrgency(email);

    // Assert - Verify collaboration sequence
    expect(mockSLAService.getSLAForUrgency).toHaveBeenCalledWith('urgent');
    expect(mockSLAService.calculateDeadline).toHaveBeenCalledWith(
      expect.any(Date),
      { hours: 1 }
    );
  });
});
```

### 1.3 RetrieverAgent Tests

**Test Scope**: Context retrieval and CRM integration

#### Mock Dependencies
```typescript
const mockCRMService = {
  findContact: jest.fn(),
  getContactHistory: jest.fn()
};

const mockTicketService = {
  findRelatedTickets: jest.fn(),
  getTicketStatus: jest.fn()
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn()
};
```

#### Key Test Scenarios
```typescript
describe('RetrieverAgent - Context Orchestration', () => {
  it('should coordinate context retrieval with caching strategy', async () => {
    // Test cache-first retrieval behavior
    const email = createTestEmail({ from: 'client@company.com' });
    mockCacheService.get.mockReturnValue(null);
    mockCRMService.findContact.mockResolvedValue({ id: '123', tier: 'enterprise' });

    await retrieverAgent.retrieveContext(email);

    // Verify interaction sequence
    expect(mockCacheService.get).toHaveBeenCalledBefore(mockCRMService.findContact);
    expect(mockCacheService.set).toHaveBeenCalledWith(
      `contact:${email.from}`,
      expect.any(Object)
    );
  });
});
```

### 1.4 RouterAgent Tests

**Test Scope**: Routing decisions and context note generation

#### Mock Dependencies
```typescript
const mockRoutingRules = {
  getRouteForIntent: jest.fn(),
  getLoadBalancingRules: jest.fn()
};

const mockContextGenerator = {
  generateNote: jest.fn(),
  formatForDepartment: jest.fn()
};
```

### 1.5 Quality Assurance Agents Tests

#### CritiqueAgent Tests
```typescript
describe('CritiqueAgent - Validation Behavior', () => {
  it('should coordinate validation checks and trigger refinement', async () => {
    // Test validation workflow orchestration
    const classification = createClassificationResult({ confidence: 0.6 });
    mockValidationRules.checkPolicyCompliance.mockReturnValue(['HR_SENSITIVE']);

    const result = await critiqueAgent.validate(classification);

    expect(mockValidationRules.checkPolicyCompliance).toHaveBeenCalledWith(classification);
    expect(mockRefinementTrigger.shouldRefine).toHaveBeenCalledWith(
      expect.objectContaining({ policyViolations: ['HR_SENSITIVE'] })
    );
  });
});
```

## 2. Integration Test Strategy

### 2.1 Agent Orchestration Tests

**Scope**: Test agent communication and workflow coordination

```typescript
describe('Agent Orchestration - Workflow Integration', () => {
  let agentOrchestrator;
  let mockAgents;

  beforeEach(() => {
    mockAgents = {
      classifier: createMockAgent('classifier'),
      urgency: createMockAgent('urgency'),
      retriever: createMockAgent('retriever'),
      router: createMockAgent('router'),
      critique: createMockAgent('critique')
    };

    agentOrchestrator = new AgentOrchestrator(mockAgents);
  });

  it('should execute full email processing workflow', async () => {
    // Arrange
    const email = createTestEmail();
    setupMockAgentResponses(mockAgents, email);

    // Act
    const result = await agentOrchestrator.processEmail(email);

    // Assert - Verify agent coordination
    expect(mockAgents.classifier.classify).toHaveBeenCalledWith(email);
    expect(mockAgents.urgency.assess).toHaveBeenCalledWith(
      email,
      expect.any(Object) // Classification result
    );
    expect(mockAgents.retriever.retrieveContext).toHaveBeenCalledWith(email);
    expect(mockAgents.router.route).toHaveBeenCalledWith(
      email,
      expect.objectContaining({
        classification: expect.any(Object),
        urgency: expect.any(Object),
        context: expect.any(Object)
      })
    );
  });

  it('should handle agent failures gracefully', async () => {
    // Test error propagation and recovery
    mockAgents.classifier.classify.mockRejectedValue(new Error('API timeout'));

    const result = await agentOrchestrator.processEmail(createTestEmail());

    expect(result.status).toBe('error');
    expect(mockAgents.critique.validateError).toHaveBeenCalled();
  });
});
```

### 2.2 Contract Verification Tests

**Scope**: Verify inter-agent contracts and interfaces

```typescript
describe('Agent Contract Verification', () => {
  it('should maintain consistent contract between classifier and router', () => {
    const classificationContract = {
      intent: 'string',
      department: 'string',
      confidence: 'number',
      signals: 'object'
    };

    const routerInputContract = {
      classification: classificationContract,
      urgency: 'object',
      context: 'object'
    };

    expect(ClassifierAgent.outputSchema).toMatchContract(classificationContract);
    expect(RouterAgent.inputSchema).toMatchContract(routerInputContract);
  });
});
```

## 3. End-to-End Test Strategy

### 3.1 Full Pipeline Tests

**Scope**: Complete email processing from ingestion to routing

```typescript
describe('Email Processing Pipeline - E2E', () => {
  let testSystem;

  beforeEach(async () => {
    testSystem = await createTestSystem({
      useRealServices: false,
      mockExternalAPIs: true
    });
  });

  it('should process support email end-to-end', async () => {
    // Arrange
    const supportEmail = createRealEmail({
      subject: 'Login issue with mobile app',
      body: 'I cannot log into the mobile app since yesterday...',
      from: 'customer@example.com'
    });

    // Act
    const result = await testSystem.processEmail(supportEmail);

    // Assert
    expect(result.routedTo).toBe('support@company.com');
    expect(result.contextNote).toContain('Customer tier: Premium');
    expect(result.urgency).toBe('normal');
    expect(result.processingTime).toBeLessThan(30000); // 30 seconds SLA
  });
});
```

### 3.2 Acceptance Criteria Validation

```typescript
describe('Acceptance Criteria Validation', () => {
  it('should achieve >90% routing accuracy', async () => {
    const testEmails = await loadTestEmailDataset(1000);
    const results = await Promise.all(
      testEmails.map(email => testSystem.processEmail(email))
    );

    const accuracy = calculateAccuracy(results);
    expect(accuracy).toBeGreaterThan(0.90);
  });

  it('should meet SLA requirements', async () => {
    const urgentEmails = await loadUrgentTestEmails(100);
    const results = await Promise.all(
      urgentEmails.map(email => testSystem.processEmail(email))
    );

    const avgProcessingTime = calculateAverageProcessingTime(results);
    expect(avgProcessingTime).toBeLessThan(3600000); // 1 hour for urgent
  });
});
```

## 4. Performance Test Strategy

### 4.1 Load Testing

**Scope**: Validate system performance under load

```typescript
describe('Performance Testing', () => {
  it('should maintain SLA compliance under peak load', async () => {
    // Simulate 100 emails/minute load
    const loadTest = new LoadTestRunner({
      emailsPerMinute: 100,
      duration: '5m',
      testType: 'sustained'
    });

    const results = await loadTest.run();

    expect(results.avgProcessingTime).toBeLessThan(30000);
    expect(results.p95ProcessingTime).toBeLessThan(60000);
    expect(results.errorRate).toBeLessThan(0.01);
  });
});
```

### 4.2 Memory and Resource Testing

```typescript
describe('Resource Usage Testing', () => {
  it('should maintain stable memory usage during continuous operation', async () => {
    const memoryMonitor = new MemoryMonitor();

    // Process 1000 emails continuously
    for (let i = 0; i < 1000; i++) {
      await testSystem.processEmail(generateRandomEmail());
      if (i % 100 === 0) {
        await memoryMonitor.takeSnapshot();
      }
    }

    const memoryGrowth = memoryMonitor.calculateGrowthRate();
    expect(memoryGrowth).toBeLessThan(0.1); // <10% memory growth
  });
});
```

## 5. Security Test Strategy

### 5.1 PII Handling Tests

**Scope**: Verify PII detection and masking

```typescript
describe('PII Security Testing', () => {
  it('should detect and mask PII in email content', async () => {
    const emailWithPII = createTestEmail({
      body: 'My SSN is 123-45-6789 and credit card is 4111-1111-1111-1111'
    });

    const result = await testSystem.processEmail(emailWithPII);

    expect(result.processedContent).not.toContain('123-45-6789');
    expect(result.processedContent).not.toContain('4111-1111-1111-1111');
    expect(result.piiTokens).toHaveLength(2);
  });
});
```

### 5.2 Access Control Tests

```typescript
describe('Access Control Testing', () => {
  it('should restrict access to classified agent outputs', async () => {
    const restrictedAgent = new ClassifierAgent({
      accessLevel: 'restricted'
    });

    const unauthorizedRequest = {
      requester: 'external-service',
      credentials: 'invalid'
    };

    await expect(
      restrictedAgent.classify(createTestEmail(), unauthorizedRequest)
    ).rejects.toThrow('Unauthorized access');
  });
});
```

## 6. Mock Strategy

### 6.1 External Service Mocks

```typescript
// Mock factory for OpenAI service
export const createOpenAIMock = () => ({
  classify: jest.fn().mockImplementation(async (input) => {
    // Intelligent mock responses based on input
    if (input.text.includes('bug') || input.text.includes('error')) {
      return { intent: 'support', confidence: 0.9 };
    }
    if (input.text.includes('purchase') || input.text.includes('buy')) {
      return { intent: 'sales', confidence: 0.85 };
    }
    return { intent: 'other', confidence: 0.6 };
  }),

  generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),

  // Contract verification
  _verifyContract: () => {
    expect(this.classify).toBeDefined();
    expect(this.generateEmbedding).toBeDefined();
  }
});

// Mock factory for CRM service
export const createCRMMock = () => ({
  findContact: jest.fn().mockImplementation(async (email) => {
    if (email.includes('enterprise')) {
      return { tier: 'enterprise', priority: 'high' };
    }
    if (email.includes('premium')) {
      return { tier: 'premium', priority: 'medium' };
    }
    return { tier: 'standard', priority: 'low' };
  }),

  getContactHistory: jest.fn().mockResolvedValue([])
});
```

### 6.2 Agent Mock Factories

```typescript
export const createMockAgent = (type) => {
  const baseMock = {
    type,
    process: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({ processed: 0 }),
    healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' })
  };

  switch (type) {
    case 'classifier':
      return {
        ...baseMock,
        classify: jest.fn().mockResolvedValue({
          intent: 'support',
          confidence: 0.9,
          department: 'support'
        })
      };

    case 'urgency':
      return {
        ...baseMock,
        assess: jest.fn().mockResolvedValue({
          level: 'normal',
          sla: { hours: 4 }
        })
      };

    // ... other agent types
  }
};
```

## 7. Test Data and Fixtures

### 7.1 Email Test Fixtures

```typescript
export const emailFixtures = {
  support: {
    subject: 'Unable to access dashboard',
    body: 'I am experiencing issues logging into my account dashboard...',
    from: 'user@company.com',
    expectedIntent: 'support',
    expectedUrgency: 'normal'
  },

  urgent: {
    subject: 'CRITICAL: Payment system down',
    body: 'Our payment processing is completely down affecting all customers...',
    from: 'admin@company.com',
    expectedIntent: 'support',
    expectedUrgency: 'urgent'
  },

  sales: {
    subject: 'Enterprise license inquiry',
    body: 'We are interested in purchasing enterprise licenses for 500 users...',
    from: 'procurement@bigcorp.com',
    expectedIntent: 'sales',
    expectedUrgency: 'normal'
  }
};
```

### 7.2 Test Data Generators

```typescript
export class EmailGenerator {
  static generateRealistic(template) {
    return {
      id: generateUUID(),
      from: template.from || faker.internet.email(),
      subject: template.subject || faker.lorem.sentence(),
      body_text: template.body || faker.lorem.paragraphs(3),
      timestamp: new Date().toISOString(),
      attachments: template.attachments || []
    };
  }

  static generateWithPII() {
    return this.generateRealistic({
      body: `Please help with account ${faker.finance.account()}.
             My SSN is ${faker.phone.number('###-##-####')}
             and card ending in ${faker.finance.creditCardNumber().slice(-4)}`
    });
  }
}
```

## 8. Test Configuration

### 8.1 Jest Configuration

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/*.(test|spec).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000
};
```

### 8.2 Test Setup

```typescript
// tests/setup.ts
import { jest } from '@jest/globals';

// Global test configuration
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Custom matchers
expect.extend({
  toMatchContract(received, expected) {
    // Implement contract matching logic
    return {
      pass: true,
      message: () => 'Contract matches expected schema'
    };
  },

  toHaveBeenCalledBefore(received, expected) {
    // Implement call order verification
    return {
      pass: true,
      message: () => 'Mock was called in correct order'
    };
  }
});
```

## 9. Continuous Integration

### 9.1 Test Pipeline

```yaml
# .github/workflows/test.yml
name: Test Pipeline
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run unit tests
        run: npm run test:unit -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v3
      - name: Setup test environment
        run: docker-compose -f docker-compose.test.yml up -d
      - name: Run integration tests
        run: npm run test:integration
      - name: Cleanup
        run: docker-compose -f docker-compose.test.yml down

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v3
      - name: Deploy test environment
        run: ./scripts/deploy-test.sh
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Generate test report
        run: npm run test:report
```

## 10. Quality Gates

### 10.1 Test Quality Metrics

- **Code Coverage**: Minimum 80% line coverage, 90% for critical paths
- **Test Execution Time**: Unit tests <5 minutes, Integration tests <15 minutes
- **Test Reliability**: <1% flaky test rate
- **Mock Contract Compliance**: 100% contract verification

### 10.2 Acceptance Criteria Gates

- **Routing Accuracy**: >90% on test dataset
- **SLA Compliance**: Urgent emails <1 hour, Routine <4 hours
- **Escalation Rate**: <5% of processed emails
- **Performance**: <30 seconds average processing time
- **Security**: 100% PII detection and masking

## 11. Test Maintenance

### 11.1 Test Review Process

- Weekly test maintenance sessions
- Quarterly test strategy review
- Mock contract evolution tracking
- Test data freshness validation

### 11.2 Test Metrics Dashboard

Track key testing KPIs:
- Test execution trends
- Coverage trends
- Flaky test identification
- Mock usage patterns
- Contract evolution tracking

## Conclusion

This TDD strategy ensures comprehensive testing coverage while maintaining the London School focus on behavior verification and mock-driven design. The outside-in approach guarantees that all tests drive real business value while the extensive mocking strategy enables fast, reliable test execution.

The strategy balances thorough testing with practical implementation concerns, ensuring that the Zetify email triage system meets all functional and non-functional requirements while maintaining high code quality and reliability.