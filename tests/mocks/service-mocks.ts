import { jest } from '@jest/globals';

// OpenAI Service Mock Factory
export const createOpenAIMock = () => ({
  classify: jest.fn().mockImplementation(async (input) => {
    // Intelligent mock responses based on input
    const text = input.text?.toLowerCase() || '';
    const subject = input.subject?.toLowerCase() || '';

    if (text.includes('bug') || text.includes('error') || text.includes('issue') ||
        subject.includes('problem') || subject.includes('help')) {
      return {
        intent: 'support',
        confidence: 0.9 + Math.random() * 0.09,
        reasoning: 'Technical issue mentioned in content'
      };
    }

    if (text.includes('purchase') || text.includes('buy') || text.includes('pricing') ||
        text.includes('sales') || subject.includes('enterprise')) {
      return {
        intent: 'sales',
        confidence: 0.85 + Math.random() * 0.1,
        reasoning: 'Commercial inquiry detected'
      };
    }

    if (text.includes('hr') || text.includes('harassment') || text.includes('employee') ||
        subject.includes('urgent') && text.includes('confidential')) {
      return {
        intent: 'hr',
        confidence: 0.88 + Math.random() * 0.1,
        reasoning: 'HR-related content identified'
      };
    }

    if (text.includes('legal') || text.includes('lawsuit') || text.includes('compliance')) {
      return {
        intent: 'legal',
        confidence: 0.91 + Math.random() * 0.08,
        reasoning: 'Legal matter detected'
      };
    }

    if (text.includes('spam') || text.includes('click here') || text.includes('urgent security') ||
        input.from?.includes('fake-domain')) {
      return {
        intent: 'spam',
        confidence: 0.95 + Math.random() * 0.04,
        reasoning: 'Suspicious content patterns detected'
      };
    }

    return {
      intent: 'other',
      confidence: 0.4 + Math.random() * 0.3,
      reasoning: 'Intent unclear, requires further analysis'
    };
  }),

  generateEmbedding: jest.fn().mockImplementation(async (text) => {
    // Generate consistent mock embeddings based on text hash
    const hash = text.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    return Array.from({ length: 384 }, (_, i) =>
      Math.sin(hash + i) * 0.5
    );
  }),

  _verifyContract: function() {
    expect(this.classify).toBeDefined();
    expect(this.generateEmbedding).toBeDefined();
  }
});

// Configuration Service Mock Factory
export const createConfigMock = () => ({
  getClassificationRules: jest.fn().mockReturnValue({
    supportKeywords: ['bug', 'error', 'issue', 'problem', 'broken'],
    salesKeywords: ['purchase', 'buy', 'pricing', 'quote', 'enterprise'],
    hrKeywords: ['hr', 'employee', 'harassment', 'benefits', 'policy'],
    legalKeywords: ['legal', 'lawsuit', 'compliance', 'contract', 'gdpr'],
    spamIndicators: ['click here', 'urgent security', 'suspended', 'verify now']
  }),

  getConfidenceThresholds: jest.fn().mockReturnValue({
    escalation: 0.65,
    rejection: 0.3,
    highConfidence: 0.85
  }),

  getDepartmentMappings: jest.fn().mockReturnValue({
    'support': 'support',
    'sales': 'sales',
    'hr': 'hr',
    'legal': 'legal',
    'finance': 'finance',
    'spam': 'security'
  })
});

// Audit Logger Mock Factory
export const createAuditLoggerMock = () => ({
  logClassification: jest.fn().mockImplementation(async (emailId, result) => {
    return {
      id: `audit-${Date.now()}`,
      emailId,
      timestamp: new Date().toISOString(),
      agent: 'ClassifierAgent',
      action: 'classify',
      result,
      hash: `hash-${emailId}-${result.intent}`
    };
  }),

  logUrgencyAssessment: jest.fn().mockImplementation(async (emailId, result) => {
    return {
      id: `audit-${Date.now()}`,
      emailId,
      timestamp: new Date().toISOString(),
      agent: 'UrgencyAgent',
      action: 'assess_urgency',
      result
    };
  }),

  logError: jest.fn().mockImplementation(async (emailId, error) => {
    return {
      id: `error-${Date.now()}`,
      emailId,
      timestamp: new Date().toISOString(),
      level: 'error',
      error: error.error || error.message,
      component: error.component
    };
  }),

  logRouting: jest.fn().mockResolvedValue({}),
  logRetrieval: jest.fn().mockResolvedValue({})
});

// SLA Service Mock Factory
export const createSLAServiceMock = () => ({
  getSLAForUrgency: jest.fn().mockImplementation((urgency) => {
    const slaMap = {
      'urgent': { hours: 1, priority: 'urgent' },
      'normal': { hours: 4, priority: 'normal' },
      'low': { hours: 24, priority: 'low' }
    };
    return slaMap[urgency] || slaMap['normal'];
  }),

  calculateDeadline: jest.fn().mockImplementation((startTime, sla) => {
    const deadline = new Date(startTime);
    deadline.setHours(deadline.getHours() + sla.hours);
    return deadline;
  }),

  shouldOverrideSLA: jest.fn().mockImplementation((explicitDeadline, standardSLA) => {
    const timeUntilDeadline = explicitDeadline.getTime() - Date.now();
    const standardTime = standardSLA.hours * 60 * 60 * 1000;
    return timeUntilDeadline < standardTime;
  }),

  estimateUrgencyFromContent: jest.fn().mockImplementation((content) => {
    const urgentKeywords = ['urgent', 'critical', 'asap', 'emergency', 'immediate'];
    const hasUrgentKeyword = urgentKeywords.some(keyword =>
      content.toLowerCase().includes(keyword)
    );
    return hasUrgentKeyword ? 'urgent' : 'normal';
  }),

  adjustUrgencyForConfidence: jest.fn().mockImplementation((urgency, confidence) => {
    if (confidence < 0.7 && urgency === 'urgent') {
      return 'normal'; // Downgrade if not confident
    }
    return urgency;
  }),

  getIntentSpecificRules: jest.fn().mockImplementation((intent) => {
    const rules = {
      'security': { autoEscalate: true, urgency: 'urgent' },
      'hr': { confidential: true, urgency: 'urgent' },
      'legal': { escalate: true, urgency: 'normal' }
    };
    return rules[intent] || {};
  }),

  getSLAForTimezone: jest.fn().mockImplementation((urgency, timezone) => {
    const baseSLA = this.getSLAForUrgency(urgency);
    return { ...baseSLA, timezone };
  }),

  checkForExceptions: jest.fn().mockImplementation((emailFrom) => {
    if (emailFrom.includes('vip') || emailFrom.includes('enterprise')) {
      return {
        hasException: true,
        type: 'vip_customer',
        urgency: 'urgent'
      };
    }
    return { hasException: false };
  }),

  getDefaultSLA: jest.fn().mockReturnValue({
    hours: 4,
    priority: 'normal'
  })
});

// Date Service Mock Factory
export const createDateServiceMock = () => ({
  getCurrentTime: jest.fn().mockReturnValue(new Date('2023-01-01T12:00:00Z')),

  parseBusinessHours: jest.fn().mockReturnValue({
    start: 9,
    end: 17,
    weekdays: [1, 2, 3, 4, 5],
    timezone: 'UTC'
  }),

  parseDeadlineFromText: jest.fn().mockImplementation((text) => {
    const deadlinePatterns = [
      /by (\w+day)/i,
      /before (\d{1,2}:\d{2})/i,
      /deadline.*?(\d{1,2}\/\d{1,2})/i
    ];

    for (const pattern of deadlinePatterns) {
      if (pattern.test(text)) {
        // Return a deadline 24 hours from now for testing
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + 24);
        return deadline;
      }
    }
    return null;
  }),

  detectTimezone: jest.fn().mockImplementation((email) => {
    const domainTimezones = {
      '.co.uk': 'Europe/London',
      '.de': 'Europe/Berlin',
      '.com.au': 'Australia/Sydney'
    };

    for (const [domain, timezone] of Object.entries(domainTimezones)) {
      if (email.includes(domain)) {
        return timezone;
      }
    }
    return 'UTC';
  }),

  getSystemTime: jest.fn().mockReturnValue(new Date('2023-01-01T12:00:00Z'))
});

// CRM Service Mock Factory
export const createCRMServiceMock = () => ({
  findContact: jest.fn().mockImplementation(async (email) => {
    const mockContacts = {
      'enterprise@company.com': { tier: 'enterprise', priority: 'high', id: 'ent-123' },
      'premium@example.com': { tier: 'premium', priority: 'medium', id: 'prem-456' },
      'vip@megacorp.com': { tier: 'vip', priority: 'urgent', id: 'vip-789' }
    };

    const contact = mockContacts[email];
    if (contact) {
      return contact;
    }

    // Default contact
    return { tier: 'standard', priority: 'low', id: 'std-' + Date.now() };
  }),

  getContactHistory: jest.fn().mockImplementation(async (contactId) => {
    if (contactId.startsWith('ent-')) {
      return [
        { type: 'purchase', date: '2023-01-01', amount: 50000 },
        { type: 'support', date: '2022-12-15', tickets: 3 }
      ];
    }
    return [];
  })
});

// Ticket Service Mock Factory
export const createTicketServiceMock = () => ({
  findRelatedTickets: jest.fn().mockImplementation(async (email) => {
    if (email.subject?.includes('follow up') || email.body_text?.includes('ticket')) {
      return [
        { id: 'TICK-123', status: 'open', created: '2023-01-01' },
        { id: 'TICK-456', status: 'resolved', created: '2022-12-30' }
      ];
    }
    return [];
  }),

  getTicketStatus: jest.fn().mockImplementation(async (ticketId) => {
    return { id: ticketId, status: 'open', priority: 'normal' };
  })
});

// Cache Service Mock Factory
export const createCacheServiceMock = () => ({
  get: jest.fn().mockImplementation(async (key) => {
    // Simulate cache miss for testing
    return null;
  }),

  set: jest.fn().mockImplementation(async (key, value, ttl) => {
    return true;
  }),

  delete: jest.fn().mockResolvedValue(true),

  clear: jest.fn().mockResolvedValue(true)
});

// Memory Store Mock Factory
export const createMemoryStoreMock = () => ({
  store: jest.fn().mockImplementation(async (key, value) => {
    return { key, value, timestamp: new Date().toISOString() };
  }),

  retrieve: jest.fn().mockImplementation(async (key) => {
    // Return relevant data based on key pattern
    if (key.includes('classification')) {
      return { intent: 'support', confidence: 0.89 };
    }
    if (key.includes('urgency')) {
      return { urgency: 'normal', sla: { hours: 4 } };
    }
    if (key.includes('context')) {
      return { customer: { tier: 'premium' }, tickets: [] };
    }
    return null;
  }),

  delete: jest.fn().mockResolvedValue(true),

  list: jest.fn().mockResolvedValue([])
});

// Workflow Mock Factory
export const createWorkflowMock = () => ({
  calculateAssuranceScore: jest.fn().mockImplementation((metrics) => {
    const weights = {
      classificationConfidence: 0.3,
      urgencyConfidence: 0.2,
      contextRelevance: 0.2,
      routingConfidence: 0.3
    };

    let score = 0;
    for (const [metric, value] of Object.entries(metrics)) {
      score += (value * (weights[metric] || 0.25));
    }

    return Math.min(Math.max(score, 0), 1);
  }),

  startTimer: jest.fn().mockReturnValue(Date.now()),

  endTimer: jest.fn().mockImplementation((startTime) => {
    return Date.now() - startTime;
  }),

  recordAgentMetrics: jest.fn().mockImplementation((agentType, metrics) => {
    return {
      agent: agentType,
      metrics,
      timestamp: new Date().toISOString()
    };
  }),

  logFailure: jest.fn().mockImplementation((agent, error) => {
    return {
      agent,
      error,
      timestamp: new Date().toISOString(),
      severity: 'error'
    };
  }),

  enableDegradedMode: jest.fn().mockReturnValue(true),

  handleTimeout: jest.fn().mockImplementation((agent, duration) => {
    return {
      agent,
      timeout: true,
      duration,
      timestamp: new Date().toISOString()
    };
  }),

  monitorMemoryUsage: jest.fn().mockReturnValue({
    used: 128 * 1024 * 1024, // 128MB
    free: 256 * 1024 * 1024  // 256MB
  }),

  checkResourceLimits: jest.fn().mockReturnValue({
    withinLimits: true,
    cpu: 45,
    memory: 67
  }),

  saveState: jest.fn().mockImplementation((workflowId, state) => {
    return { saved: true, workflowId, state };
  }),

  loadState: jest.fn().mockImplementation((workflowId) => {
    return {
      step: 'routing',
      completedSteps: ['classification', 'urgency', 'retrieval'],
      intermediateResults: {}
    };
  }),

  verifyContract: jest.fn().mockImplementation((type, data) => {
    // Basic contract verification
    const schemas = {
      classification: ['intent', 'confidence', 'department'],
      urgency: ['urgency', 'sla'],
      routing: ['routedTo', 'contextNote']
    };

    const required = schemas[type] || [];
    return required.every(field => data.hasOwnProperty(field));
  })
});

// Routing Rules Mock Factory
export const createRoutingRulesMock = () => ({
  getRouteForIntent: jest.fn().mockImplementation((intent, department) => {
    const routes = {
      'support': 'support@company.com',
      'sales': 'sales@company.com',
      'hr': 'hr@company.com',
      'legal': 'legal@company.com',
      'finance': 'finance@company.com',
      'spam': 'security@company.com'
    };
    return routes[intent] || 'general@company.com';
  }),

  getLoadBalancingRules: jest.fn().mockReturnValue({
    maxQueueSize: 100,
    distributionStrategy: 'round-robin'
  })
});

// Context Generator Mock Factory
export const createContextGeneratorMock = () => ({
  generateNote: jest.fn().mockImplementation((email, classification, urgency, context) => {
    let note = `Intent: ${classification.intent}, Urgency: ${urgency.urgency}`;

    if (context.customer) {
      note += `, Customer tier: ${context.customer.tier}`;
    }

    if (context.tickets && context.tickets.length > 0) {
      note += `, Related tickets: ${context.tickets.length}`;
    }

    return note;
  }),

  formatForDepartment: jest.fn().mockImplementation((note, department) => {
    return `[${department.toUpperCase()}] ${note}`;
  })
});

// Validation Rules Mock Factory
export const createValidationRulesMock = () => ({
  checkPolicyCompliance: jest.fn().mockImplementation((classification) => {
    const violations = [];

    if (classification.intent === 'hr' && classification.signals?.is_hr_sensitive) {
      violations.push('HR_CONFIDENTIAL');
    }

    if (classification.confidence < 0.5) {
      violations.push('LOW_CONFIDENCE');
    }

    return violations;
  })
});

// Refinement Trigger Mock Factory
export const createRefinementTriggerMock = () => ({
  shouldRefine: jest.fn().mockImplementation((validationResult) => {
    return validationResult.confidence < 0.65 ||
           validationResult.policyViolations?.length > 0;
  })
});