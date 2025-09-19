import { jest } from '@jest/globals';

// Configure test environment
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.DB_URL = 'sqlite://memory';

  // Configure test timeouts
  jest.setTimeout(30000);
});

// Clean up after each test
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  jest.clearAllTimers();

  // Reset modules
  jest.resetModules();

  // Clear any test data
  if (global.testDataStore) {
    global.testDataStore.clear();
  }
});

// Global cleanup
afterAll(async () => {
  // Close any open connections
  if (global.testDB) {
    await global.testDB.close();
  }

  // Clean up test files
  if (global.testCleanup) {
    await global.testCleanup();
  }
});

// Custom matchers for London School TDD
expect.extend({
  // Contract verification matcher
  toMatchContract(received: any, expected: any) {
    const pass = Object.keys(expected).every(key => {
      const expectedType = expected[key];
      const actualValue = received[key];

      if (expectedType === 'string') {
        return typeof actualValue === 'string';
      }
      if (expectedType === 'number') {
        return typeof actualValue === 'number' && !isNaN(actualValue);
      }
      if (expectedType === 'boolean') {
        return typeof actualValue === 'boolean';
      }
      if (expectedType === 'array') {
        return Array.isArray(actualValue);
      }
      if (expectedType === 'object') {
        return typeof actualValue === 'object' && actualValue !== null && !Array.isArray(actualValue);
      }

      return false;
    });

    return {
      pass,
      message: () => {
        const missing = Object.keys(expected).filter(key => !(key in received));
        const wrongType = Object.keys(expected).filter(key => {
          const expectedType = expected[key];
          const actualValue = received[key];
          if (expectedType === 'string') return typeof actualValue !== 'string';
          if (expectedType === 'number') return typeof actualValue !== 'number' || isNaN(actualValue);
          if (expectedType === 'boolean') return typeof actualValue !== 'boolean';
          if (expectedType === 'array') return !Array.isArray(actualValue);
          if (expectedType === 'object') return typeof actualValue !== 'object' || actualValue === null || Array.isArray(actualValue);
          return false;
        });

        if (!pass) {
          let message = 'Contract validation failed:';
          if (missing.length > 0) {
            message += `\\n  Missing properties: ${missing.join(', ')}`;
          }
          if (wrongType.length > 0) {
            message += `\\n  Wrong types: ${wrongType.map(key => `${key} (expected ${expected[key]}, got ${typeof received[key]})`).join(', ')}`;
          }
          return message;
        }

        return 'Contract matches expected schema';
      }
    };
  },

  // Interaction order verification
  toHaveBeenCalledBefore(received: jest.Mock, expected: jest.Mock) {
    const receivedCalls = received.mock.invocationCallOrder;
    const expectedCalls = expected.mock.invocationCallOrder;

    if (receivedCalls.length === 0) {
      return {
        pass: false,
        message: () => 'Expected mock was never called'
      };
    }

    if (expectedCalls.length === 0) {
      return {
        pass: false,
        message: () => 'Comparison mock was never called'
      };
    }

    const lastReceivedCall = Math.max(...receivedCalls);
    const firstExpectedCall = Math.min(...expectedCalls);
    const pass = lastReceivedCall < firstExpectedCall;

    return {
      pass,
      message: () => pass
        ? 'Mock was called before comparison mock'
        : `Expected mock to be called before comparison mock, but it was called after (call order: ${lastReceivedCall} vs ${firstExpectedCall})`
    };
  },

  // Behavior verification for agent interactions
  toHaveCoordinatedWith(received: any, expectedAgent: string, expectedData?: any) {
    const coordinationCalls = received.coordinateWith?.mock?.calls || [];
    const relevantCalls = coordinationCalls.filter(call =>
      call[0]?.type === expectedAgent || call[0] === expectedAgent
    );

    const pass = relevantCalls.length > 0;

    if (expectedData && pass) {
      const dataMatches = relevantCalls.some(call => {
        const actualData = call[1];
        return JSON.stringify(actualData) === JSON.stringify(expectedData);
      });

      if (!dataMatches) {
        return {
          pass: false,
          message: () => `Agent coordinated with ${expectedAgent} but with different data. Expected: ${JSON.stringify(expectedData)}, Actual calls: ${JSON.stringify(relevantCalls.map(c => c[1]))}`
        };
      }
    }

    return {
      pass,
      message: () => pass
        ? `Agent coordinated with ${expectedAgent}`
        : `Expected agent to coordinate with ${expectedAgent}, but it didn't. Coordination calls: ${coordinationCalls.map(c => c[0]?.type || c[0]).join(', ')}`
    };
  },

  // Memory sharing verification
  toHaveSharedMemory(received: any, expectedKey: string, expectedValue?: any) {
    const memoryCalls = received.shareMemory?.mock?.calls || [];
    const relevantCalls = memoryCalls.filter(call => call[0] === expectedKey);

    const pass = relevantCalls.length > 0;

    if (expectedValue && pass) {
      const valueMatches = relevantCalls.some(call =>
        JSON.stringify(call[1]) === JSON.stringify(expectedValue)
      );

      if (!valueMatches) {
        return {
          pass: false,
          message: () => `Memory was shared with key ${expectedKey} but with different value`
        };
      }
    }

    return {
      pass,
      message: () => pass
        ? `Memory was shared with key ${expectedKey}`
        : `Expected memory to be shared with key ${expectedKey}, but it wasn't`
    };
  },

  // Assurance score validation
  toMeetAssuranceThreshold(received: any, threshold: number) {
    const score = received.assuranceScore || received.score || 0;
    const pass = score >= threshold;

    return {
      pass,
      message: () => pass
        ? `Assurance score ${score} meets threshold ${threshold}`
        : `Assurance score ${score} below threshold ${threshold}`
    };
  },

  // SLA compliance verification
  toMeetSLARequirement(received: any, slaType: string, maxTime: number) {
    const processingTime = received.processingTime || received.duration || 0;
    const urgency = received.urgency?.level || received.urgency || 'normal';

    let expectedMaxTime = maxTime;
    if (slaType === 'auto') {
      expectedMaxTime = urgency === 'urgent' ? 3600000 : 14400000; // 1h or 4h
    }

    const pass = processingTime <= expectedMaxTime;

    return {
      pass,
      message: () => pass
        ? `Processing time ${processingTime}ms meets SLA requirement ${expectedMaxTime}ms for ${urgency} urgency`
        : `Processing time ${processingTime}ms exceeds SLA requirement ${expectedMaxTime}ms for ${urgency} urgency`
    };
  },

  // PII masking verification
  toHaveMaskedPII(received: string, piiPatterns: RegExp[]) {
    const defaultPatterns = [
      /\\d{3}-\\d{2}-\\d{4}/, // SSN
      /\\d{4}[-\\s]\\d{4}[-\\s]\\d{4}[-\\s]\\d{4}/, // Credit card
      /\\(\\d{3}\\)\\s\\d{3}-\\d{4}/, // Phone number
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/ // Email
    ];

    const patterns = piiPatterns || defaultPatterns;
    const foundPII = patterns.some(pattern => pattern.test(received));

    return {
      pass: !foundPII,
      message: () => foundPII
        ? `Text contains unmasked PII: ${received}`
        : 'All PII appears to be properly masked'
    };
  }
});

// Global test utilities
global.createTestData = {
  email: (overrides = {}) => ({
    id: 'test-' + Math.random().toString(36).substr(2, 9),
    from: 'test@example.com',
    subject: 'Test Email',
    body_text: 'This is a test email body',
    attachments: [],
    timestamp: new Date().toISOString(),
    ...overrides
  }),

  classification: (overrides = {}) => ({
    status: 'ok',
    intent: 'support',
    department: 'support',
    confidence: 0.85,
    secondary_intents: [],
    signals: {},
    reasoning: 'Test classification',
    ...overrides
  }),

  urgency: (overrides = {}) => ({
    urgency: 'normal',
    sla: { hours: 4 },
    deadline: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    reasoning: 'Test urgency assessment',
    confidence: 0.88,
    ...overrides
  })
};

// Mock factory shortcuts
global.mockAgent = (type: string) => {
  const { createMockAgent } = require('./mocks/agent-mocks');
  return createMockAgent(type);
};

global.mockService = (service: string) => {
  const mocks = require('./mocks/service-mocks');
  const mockFactories = {
    openai: mocks.createOpenAIMock,
    config: mocks.createConfigMock,
    audit: mocks.createAuditLoggerMock,
    sla: mocks.createSLAServiceMock,
    date: mocks.createDateServiceMock,
    crm: mocks.createCRMServiceMock,
    ticket: mocks.createTicketServiceMock,
    cache: mocks.createCacheServiceMock,
    memory: mocks.createMemoryStoreMock,
    workflow: mocks.createWorkflowMock
  };

  const factory = mockFactories[service];
  if (!factory) {
    throw new Error(`Unknown service mock: ${service}`);
  }

  return factory();
};

// Test data store for persistence across tests
global.testDataStore = new Map();

// Console override for cleaner test output
const originalConsoleError = console.error;
console.error = (...args) => {
  // Suppress expected error messages in tests
  const message = args[0]?.toString() || '';
  if (message.includes('Warning:') || message.includes('Deprecation:')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Debug utilities for development
global.debugTest = {
  logMockCalls: (mock: jest.Mock, label = 'Mock') => {
    console.log(`\\n=== ${label} Mock Calls ===`);
    mock.mock.calls.forEach((call, index) => {
      console.log(`Call ${index + 1}:`, call);
    });
    console.log('========================\\n');
  },

  logTestData: (data: any, label = 'Test Data') => {
    console.log(`\\n=== ${label} ===`);
    console.log(JSON.stringify(data, null, 2));
    console.log('==================\\n');
  }
};

// Performance timing utilities
global.measurePerformance = {
  start: () => Date.now(),
  end: (startTime: number, label = 'Operation') => {
    const duration = Date.now() - startTime;
    console.log(`${label} took ${duration}ms`);
    return duration;
  }
};