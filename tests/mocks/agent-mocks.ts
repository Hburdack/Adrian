import { jest } from '@jest/globals';

export interface MockAgent {
  type: string;
  process: jest.Mock;
  getMetrics: jest.Mock;
  healthCheck: jest.Mock;
  [key: string]: any;
}

export const createMockAgent = (type: string): MockAgent => {
  const baseMock: MockAgent = {
    type,
    process: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({
      processed: 0,
      success: 0,
      failed: 0,
      avgProcessingTime: 0
    }),
    healthCheck: jest.fn().mockResolvedValue({
      status: 'healthy',
      lastChecked: new Date().toISOString()
    })
  };

  // Add type-specific methods and behaviors
  switch (type) {
    case 'classifier':
      return {
        ...baseMock,
        classify: jest.fn().mockImplementation(async (email) => {
          // Simulate processing delay
          await new Promise(resolve => setTimeout(resolve, 100));

          return {
            status: 'ok',
            intent: detectIntentFromEmail(email),
            department: mapIntentToDepartment(detectIntentFromEmail(email)),
            confidence: 0.85 + Math.random() * 0.1,
            secondary_intents: [],
            signals: extractSignals(email),
            reasoning: 'Mock classification based on email content',
            processing_time_ms: 100
          };
        }),

        classifyWithFallback: jest.fn().mockResolvedValue({
          intent: 'support',
          confidence: 0.7,
          fallbackUsed: true,
          reasoning: 'Fallback classification due to service failure'
        })
      };

    case 'urgency':
      return {
        ...baseMock,
        assess: jest.fn().mockImplementation(async (email, classification) => {
          const urgency = detectUrgency(email, classification);
          const sla = getSLAForUrgency(urgency);

          return {
            urgency,
            sla,
            deadline: calculateDeadline(sla),
            reasoning: `Urgency assessed as ${urgency} based on content analysis`,
            confidence: 0.88 + Math.random() * 0.1,
            processing_time_ms: 80
          };
        }),

        assessUrgency: jest.fn().mockImplementation(async (email, classification) => {
          return baseMock.assess(email, classification);
        })
      };

    case 'retriever':
      return {
        ...baseMock,
        retrieveContext: jest.fn().mockImplementation(async (email) => {
          // Simulate CRM/context lookup
          await new Promise(resolve => setTimeout(resolve, 200));

          return {
            customer: getCustomerContext(email.from),
            tickets: getRelatedTickets(email),
            history: getInteractionHistory(email.from),
            relevanceScore: 0.75 + Math.random() * 0.2,
            processing_time_ms: 200
          };
        })
      };

    case 'router':
      return {
        ...baseMock,
        route: jest.fn().mockImplementation(async (email, processingData) => {
          const { classification, urgency, context } = processingData;

          return {
            routedTo: getRouteForClassification(classification),
            contextNote: generateContextNote(classification, urgency, context),
            priority: urgency.urgency,
            confidence: 0.90 + Math.random() * 0.08,
            processing_time_ms: 50
          };
        })
      };

    case 'critique':
      return {
        ...baseMock,
        validate: jest.fn().mockImplementation(async (processingResult) => {
          const { classification, urgency, routing } = processingResult;

          const score = calculateAssuranceScore(classification, urgency, routing);
          const action = score > 0.75 ? 'accept' : score > 0.6 ? 'refine' : 'escalate';

          return {
            score,
            action,
            confidence: classification.confidence,
            issues: score < 0.75 ? ['low_confidence'] : [],
            recommendations: action === 'refine' ? ['retry_with_alternative_prompt'] : [],
            processing_time_ms: 60
          };
        }),

        validateError: jest.fn().mockResolvedValue({
          canRecover: true,
          suggestedAction: 'retry_with_fallback',
          severity: 'medium'
        })
      };

    case 'refiner':
      return {
        ...baseMock,
        improve: jest.fn().mockImplementation(async (originalResult) => {
          // Simulate refinement improving confidence
          const improvedConfidence = Math.min(originalResult.originalResult?.confidence + 0.15, 0.95);

          return {
            ...originalResult.originalResult,
            confidence: improvedConfidence,
            refined: true,
            iterations: (originalResult.iterations || 0) + 1,
            refinement_strategy: 'alternative_prompt',
            processing_time_ms: 150
          };
        })
      };

    case 'escalator':
      return {
        ...baseMock,
        createReviewPacket: jest.fn().mockImplementation(async (email, escalationData) => {
          return {
            reviewId: `review-${Date.now()}`,
            emailId: email.id,
            priority: escalationData.finalConfidence < 0.3 ? 'urgent' : 'normal',
            reason: escalationData.escalationReason,
            attempts: escalationData.attempts,
            summary: `Email from ${email.from} requires human review`,
            processingHistory: escalationData,
            assignedTo: 'human-reviewer@company.com',
            processing_time_ms: 30
          };
        })
      };

    default:
      return baseMock;
  }
};

// Helper functions for realistic mock behavior

function detectIntentFromEmail(email: any): string {
  const subject = email.subject?.toLowerCase() || '';
  const body = email.body_text?.toLowerCase() || '';
  const content = `${subject} ${body}`;

  if (content.includes('bug') || content.includes('error') || content.includes('issue')) {
    return 'support';
  }
  if (content.includes('purchase') || content.includes('sales') || content.includes('pricing')) {
    return 'sales';
  }
  if (content.includes('hr') || content.includes('harassment') || content.includes('employee')) {
    return 'hr';
  }
  if (content.includes('legal') || content.includes('contract') || content.includes('lawsuit')) {
    return 'legal';
  }
  if (content.includes('spam') || content.includes('phishing') || email.from?.includes('suspicious')) {
    return 'spam';
  }
  return 'general';
}

function mapIntentToDepartment(intent: string): string {
  const mapping = {
    'support': 'support',
    'sales': 'sales',
    'hr': 'hr',
    'legal': 'legal',
    'finance': 'finance',
    'spam': 'security',
    'general': 'general'
  };
  return mapping[intent] || 'general';
}

function extractSignals(email: any): object {
  const content = `${email.subject || ''} ${email.body_text || ''}`.toLowerCase();

  return {
    is_deadline: /deadline|due|by \w+day|before/.test(content),
    is_legal_risk: /legal|lawsuit|compliance|violation/.test(content),
    is_hr_sensitive: /harassment|confidential|hr/.test(content),
    is_urgent: /urgent|critical|emergency|asap/.test(content),
    has_attachment: email.attachments?.length > 0
  };
}

function detectUrgency(email: any, classification: any): string {
  const content = `${email.subject || ''} ${email.body_text || ''}`.toLowerCase();

  if (content.includes('urgent') || content.includes('critical') || content.includes('emergency')) {
    return 'urgent';
  }
  if (classification?.intent === 'hr' && content.includes('confidential')) {
    return 'urgent';
  }
  if (classification?.intent === 'security' || classification?.intent === 'spam') {
    return 'urgent';
  }
  return 'normal';
}

function getSLAForUrgency(urgency: string): object {
  const slaMap = {
    'urgent': { hours: 1, businessHours: false },
    'normal': { hours: 4, businessHours: true },
    'low': { hours: 24, businessHours: true }
  };
  return slaMap[urgency] || slaMap['normal'];
}

function calculateDeadline(sla: any): string {
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + sla.hours);
  return deadline.toISOString();
}

function getCustomerContext(email: string): object {
  // Mock customer data based on email domain
  if (email.includes('enterprise') || email.includes('corp')) {
    return {
      tier: 'enterprise',
      priority: 'high',
      account_manager: 'john.doe@company.com',
      contract_value: 100000
    };
  }
  if (email.includes('premium')) {
    return {
      tier: 'premium',
      priority: 'medium',
      contract_value: 10000
    };
  }
  return {
    tier: 'standard',
    priority: 'low',
    contract_value: 1000
  };
}

function getRelatedTickets(email: any): any[] {
  // Mock related tickets based on subject
  if (email.subject?.includes('follow up') || email.body_text?.includes('ticket')) {
    return [
      { id: 'TICK-123', status: 'open', created: '2023-01-01' },
      { id: 'TICK-456', status: 'resolved', created: '2022-12-30' }
    ];
  }
  return [];
}

function getInteractionHistory(email: string): any[] {
  // Mock interaction history
  return [
    {
      date: '2023-01-01',
      type: 'email',
      subject: 'Previous inquiry',
      resolved: true
    }
  ];
}

function getRouteForClassification(classification: any): string {
  const routes = {
    'support': 'support@company.com',
    'sales': 'sales@company.com',
    'hr': 'hr@company.com',
    'legal': 'legal@company.com',
    'finance': 'finance@company.com',
    'spam': 'security@company.com',
    'general': 'general@company.com'
  };
  return routes[classification.intent] || routes['general'];
}

function generateContextNote(classification: any, urgency: any, context: any): string {
  let note = `Intent: ${classification.intent}, Urgency: ${urgency.urgency}`;

  if (context.customer) {
    note += `, Customer tier: ${context.customer.tier}`;
  }

  if (context.tickets && context.tickets.length > 0) {
    note += `, Related tickets: ${context.tickets.length}`;
  }

  if (urgency.urgency === 'urgent') {
    note += `, URGENT - SLA: ${urgency.sla.hours}h`;
  }

  return note;
}

function calculateAssuranceScore(classification: any, urgency: any, routing: any): number {
  // Mock assurance score calculation
  let score = 0;

  score += classification.confidence * 0.4;
  score += urgency.confidence * 0.3;
  score += routing.confidence * 0.3;

  return Math.min(Math.max(score, 0), 1);
}

// Factory for creating swarms of agents
export const createAgentSwarm = (agentTypes: string[]): Record<string, MockAgent> => {
  const swarm: Record<string, MockAgent> = {};

  agentTypes.forEach(type => {
    swarm[type] = createMockAgent(type);
  });

  return swarm;
};

// Contract verification helpers
export const verifyAgentContract = (agent: MockAgent, expectedMethods: string[]): boolean => {
  return expectedMethods.every(method => typeof agent[method] === 'function');
};

export const setupAgentCoordination = (agents: Record<string, MockAgent>): void => {
  // Setup coordination between agents
  Object.values(agents).forEach(agent => {
    agent.coordinateWith = jest.fn().mockImplementation(async (otherAgent, data) => {
      return { coordinated: true, data };
    });

    agent.shareMemory = jest.fn().mockImplementation(async (key, value) => {
      return { shared: true, key, value };
    });

    agent.retrieveMemory = jest.fn().mockImplementation(async (key) => {
      return { retrieved: true, key, value: `mock-value-${key}` };
    });
  });
};