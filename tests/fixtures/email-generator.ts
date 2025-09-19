import { faker } from '@faker-js/faker';

export interface TestEmail {
  id: string;
  from: string;
  subject: string;
  body_text: string;
  attachments: string[];
  timestamp: string;
  metadata?: {
    expectedIntent?: string;
    expectedUrgency?: string;
    expectedDepartment?: string;
    hasDeadline?: boolean;
    hasPII?: boolean;
  };
}

export class EmailGenerator {
  static generateBasic(): TestEmail {
    return {
      id: faker.string.uuid(),
      from: faker.internet.email(),
      subject: faker.lorem.sentence(),
      body_text: faker.lorem.paragraphs(2),
      attachments: [],
      timestamp: new Date().toISOString()
    };
  }

  static generateSupport(): TestEmail {
    const supportSubjects = [
      'Unable to access my account',
      'Bug in the login system',
      'Feature not working as expected',
      'Need help with configuration',
      'Error message when uploading files'
    ];

    const supportBodies = [
      'I am experiencing issues with my account access. When I try to log in, I get an error message...',
      'There seems to be a bug in your system. Every time I click the submit button, nothing happens...',
      'I need help configuring the settings for my team. The documentation is unclear about...',
      'I keep getting timeout errors when trying to upload large files. Can you help?'
    ];

    return {
      id: faker.string.uuid(),
      from: faker.internet.email(),
      subject: faker.helpers.arrayElement(supportSubjects),
      body_text: faker.helpers.arrayElement(supportBodies),
      attachments: [],
      timestamp: new Date().toISOString(),
      metadata: {
        expectedIntent: 'support',
        expectedDepartment: 'support',
        expectedUrgency: 'normal'
      }
    };
  }

  static generateUrgent(): TestEmail {
    const urgentKeywords = ['URGENT', 'CRITICAL', 'ASAP', 'EMERGENCY', 'IMMEDIATE'];
    const urgentSubjects = [
      'URGENT: System completely down',
      'CRITICAL: Payment processing failed',
      'EMERGENCY: Security breach detected',
      'IMMEDIATE ATTENTION: Data corruption'
    ];

    const urgentBodies = [
      'This is extremely urgent. Our entire system is down and affecting all customers...',
      'CRITICAL ISSUE: Payment processing has completely stopped working. We need immediate assistance...',
      'EMERGENCY: We suspect a security breach. Please contact us immediately...',
      'This requires immediate attention. We are losing customers due to this issue...'
    ];

    return {
      id: faker.string.uuid(),
      from: faker.internet.email(),
      subject: faker.helpers.arrayElement(urgentSubjects),
      body_text: faker.helpers.arrayElement(urgentBodies),
      attachments: [],
      timestamp: new Date().toISOString(),
      metadata: {
        expectedUrgency: 'urgent',
        hasDeadline: true
      }
    };
  }

  static generateSales(): TestEmail {
    const salesSubjects = [
      'Enterprise license pricing inquiry',
      'Bulk purchase for 500+ users',
      'Partnership opportunity',
      'Custom solution requirements'
    ];

    const salesBodies = [
      'We are interested in purchasing enterprise licenses for our team of 300+ users...',
      'Our company is evaluating your solution for a potential partnership...',
      'We need custom features for our enterprise deployment. What are your pricing options?',
      'Looking for volume discounts for a large implementation across multiple locations...'
    ];

    return {
      id: faker.string.uuid(),
      from: faker.internet.email(),
      subject: faker.helpers.arrayElement(salesSubjects),
      body_text: faker.helpers.arrayElement(salesBodies),
      attachments: [],
      timestamp: new Date().toISOString(),
      metadata: {
        expectedIntent: 'sales',
        expectedDepartment: 'sales',
        expectedUrgency: 'normal'
      }
    };
  }

  static generateHRSensitive(): TestEmail {
    return {
      id: faker.string.uuid(),
      from: 'employee.confidential@company.com',
      subject: 'Confidential HR matter - Workplace harassment',
      body_text: `This is a confidential matter regarding workplace harassment that occurred yesterday.
                  I need to speak with HR leadership immediately about this incident.
                  Please treat this as urgent and confidential.

                  Employee ID: EMP-${faker.number.int({ min: 10000, max: 99999 })}`,
      attachments: [],
      timestamp: new Date().toISOString(),
      metadata: {
        expectedIntent: 'hr',
        expectedDepartment: 'hr',
        expectedUrgency: 'urgent',
        hasPII: true
      }
    };
  }

  static generateLegalRisk(): TestEmail {
    return {
      id: faker.string.uuid(),
      from: faker.internet.email(),
      subject: 'Legal notice regarding contract dispute',
      body_text: `We are writing to inform you of a potential legal dispute regarding our contract.
                  Please have your legal team review the attached documents immediately.
                  This matter requires urgent legal attention to avoid escalation.`,
      attachments: ['contract_dispute.pdf'],
      timestamp: new Date().toISOString(),
      metadata: {
        expectedIntent: 'legal',
        expectedDepartment: 'legal',
        expectedUrgency: 'urgent'
      }
    };
  }

  static generateWithDeadline(): TestEmail {
    const deadlineTexts = [
      'Please respond by end of day Friday',
      'We need this resolved before our Monday meeting',
      'Deadline is 5 PM tomorrow',
      'This must be completed by next Tuesday'
    ];

    return {
      id: faker.string.uuid(),
      from: faker.internet.email(),
      subject: 'Time-sensitive request',
      body_text: `${faker.lorem.paragraph()} ${faker.helpers.arrayElement(deadlineTexts)}`,
      attachments: [],
      timestamp: new Date().toISOString(),
      metadata: {
        hasDeadline: true,
        expectedUrgency: 'urgent'
      }
    };
  }

  static generateWithExplicitDeadline(): TestEmail {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      id: faker.string.uuid(),
      from: faker.internet.email(),
      subject: 'Contract renewal deadline',
      body_text: `Our contract expires on ${tomorrow.toLocaleDateString()}. Please send the renewal documents before 5 PM tomorrow.`,
      attachments: [],
      timestamp: new Date().toISOString(),
      metadata: {
        hasDeadline: true,
        expectedUrgency: 'urgent'
      }
    };
  }

  static generateWithAmbiguousDeadline(): TestEmail {
    return {
      id: faker.string.uuid(),
      from: faker.internet.email(),
      subject: 'Follow up needed soon',
      body_text: 'We should probably touch base sometime this week about the project updates.',
      attachments: [],
      timestamp: new Date().toISOString(),
      metadata: {
        expectedUrgency: 'normal'
      }
    };
  }

  static generateAmbiguous(): TestEmail {
    const ambiguousTexts = [
      'Can you help me with this thing?',
      'I have a question about stuff',
      'This is important, please advise',
      'Need to discuss something'
    ];

    return {
      id: faker.string.uuid(),
      from: faker.internet.email(),
      subject: faker.helpers.arrayElement(ambiguousTexts),
      body_text: 'This is a very vague email that could be about anything. Not clear what the intent is.',
      attachments: [],
      timestamp: new Date().toISOString(),
      metadata: {
        expectedIntent: 'other'
      }
    };
  }

  static generateCritical(): TestEmail {
    return {
      id: faker.string.uuid(),
      from: faker.internet.email(),
      subject: 'CRITICAL: Production system failure',
      body_text: 'CRITICAL ALERT: Our production systems are experiencing complete failure. All services are down. This requires immediate emergency response.',
      attachments: [],
      timestamp: new Date().toISOString(),
      metadata: {
        expectedUrgency: 'urgent',
        expectedIntent: 'support'
      }
    };
  }

  static generateRoutine(): TestEmail {
    return {
      id: faker.string.uuid(),
      from: faker.internet.email(),
      subject: 'Monthly report question',
      body_text: 'I have a question about the monthly reports. When you have time, could you explain how the calculation works?',
      attachments: [],
      timestamp: new Date().toISOString(),
      metadata: {
        expectedUrgency: 'normal'
      }
    };
  }

  static generateSecurity(): TestEmail {
    return {
      id: faker.string.uuid(),
      from: faker.internet.email(),
      subject: 'Security incident report',
      body_text: 'We detected unusual activity on our account. Please investigate immediately and secure our systems.',
      attachments: [],
      timestamp: new Date().toISOString(),
      metadata: {
        expectedIntent: 'security',
        expectedUrgency: 'urgent'
      }
    };
  }

  static generateInternational(): TestEmail {
    return {
      id: faker.string.uuid(),
      from: 'customer@example.co.uk',
      subject: 'Support request from UK office',
      body_text: 'We need assistance with our UK deployment. Please coordinate with our London timezone.',
      attachments: [],
      timestamp: new Date().toISOString()
    };
  }

  static generateVIP(): TestEmail {
    return {
      id: faker.string.uuid(),
      from: 'ceo@enterprise-client.com',
      subject: 'Enterprise customer needs assistance',
      body_text: 'As your largest enterprise customer, we need priority support for a critical issue.',
      attachments: [],
      timestamp: new Date().toISOString(),
      metadata: {
        expectedUrgency: 'urgent'
      }
    };
  }

  static generateEnterprise(): TestEmail {
    return {
      id: faker.string.uuid(),
      from: 'admin@enterprise.com',
      subject: 'Enterprise support request',
      body_text: 'Enterprise customer requiring white-glove support for system integration.',
      attachments: [],
      timestamp: new Date().toISOString()
    };
  }

  static generateComplex(): TestEmail {
    return {
      id: faker.string.uuid(),
      from: faker.internet.email(),
      subject: 'Multi-faceted business inquiry',
      body_text: `We have multiple requirements:
                  1. Technical support for integration
                  2. Sales information for additional licenses
                  3. Legal review of contract terms
                  4. HR questions about training programs`,
      attachments: ['requirements.pdf', 'contract_draft.docx'],
      timestamp: new Date().toISOString(),
      metadata: {
        expectedIntent: 'sales' // Primary intent
      }
    };
  }

  static generateHighlyAmbiguous(): TestEmail {
    return {
      id: faker.string.uuid(),
      from: faker.internet.email(),
      subject: 'Quick question',
      body_text: 'Hi, quick question. Thanks.',
      attachments: [],
      timestamp: new Date().toISOString(),
      metadata: {
        expectedIntent: 'other'
      }
    };
  }

  static generateMultiIntent(): TestEmail {
    return {
      id: faker.string.uuid(),
      from: faker.internet.email(),
      subject: 'Sales inquiry with technical questions',
      body_text: 'We are interested in purchasing your enterprise solution. However, we also have some technical questions about integration and need support documentation.',
      attachments: [],
      timestamp: new Date().toISOString(),
      metadata: {
        expectedIntent: 'sales'
      }
    };
  }

  static generateWithPII(): TestEmail {
    return {
      id: faker.string.uuid(),
      from: faker.internet.email(),
      subject: 'Account verification needed',
      body_text: `Please help me verify my account information:
                  Social Security Number: 123-45-6789
                  Credit Card: 4111-1111-1111-1111
                  Date of Birth: 01/15/1980
                  Driver's License: DL123456789`,
      attachments: [],
      timestamp: new Date().toISOString(),
      metadata: {
        hasPII: true
      }
    };
  }

  static generateFromKnownCustomer(): TestEmail {
    return {
      id: faker.string.uuid(),
      from: 'premium@example.com',
      subject: 'Premium customer support request',
      body_text: 'As a premium customer, I need assistance with my account settings.',
      attachments: [],
      timestamp: new Date().toISOString()
    };
  }

  static generateFollowUp(): TestEmail {
    return {
      id: faker.string.uuid(),
      from: faker.internet.email(),
      subject: 'Follow up on ticket TICK-123',
      body_text: 'Following up on my previous ticket TICK-123. Has there been any progress?',
      attachments: [],
      timestamp: new Date().toISOString()
    };
  }

  static generateMixed(): TestEmail {
    const types = ['support', 'sales', 'hr', 'general', 'ambiguous'];
    const type = faker.helpers.arrayElement(types);

    switch (type) {
      case 'support':
        return this.generateSupport();
      case 'sales':
        return this.generateSales();
      case 'hr':
        return this.generateHRSensitive();
      case 'ambiguous':
        return this.generateAmbiguous();
      default:
        return this.generateBasic();
    }
  }

  static generateRealistic(options: {
    type?: string;
    subject?: string;
    body?: string;
    from?: string;
    timestamp?: string;
    sequenceNumber?: number;
  }): TestEmail {
    const { type = 'general', subject, body, from, timestamp, sequenceNumber } = options;

    const generators = {
      support: () => this.generateSupport(),
      sales: () => this.generateSales(),
      hr: () => this.generateHRSensitive(),
      urgent: () => this.generateUrgent(),
      spam: () => this.generateSpam(),
      general: () => this.generateBasic()
    };

    const email = generators[type]?.() || this.generateBasic();

    if (subject) email.subject = subject;
    if (body) email.body_text = body;
    if (from) email.from = from;
    if (timestamp) email.timestamp = timestamp;
    if (sequenceNumber !== undefined) {
      email.id = `test-${sequenceNumber}-${email.id}`;
    }

    return email;
  }

  static generateSpam(): TestEmail {
    return {
      id: faker.string.uuid(),
      from: 'noreply@suspicious-domain.com',
      subject: 'URGENT: Your account will be suspended - Click here NOW!',
      body_text: `Your account has been flagged for suspicious activity.
                  Click here immediately to verify: http://phishing-site.com
                  Provide your SSN and credit card to continue.`,
      attachments: [],
      timestamp: new Date().toISOString(),
      metadata: {
        expectedIntent: 'spam'
      }
    };
  }

  static async loadTestDataset(count: number): Promise<TestEmail[]> {
    // Generate a balanced dataset
    const types = ['support', 'sales', 'hr', 'general'];
    const emails: TestEmail[] = [];

    for (let i = 0; i < count; i++) {
      const type = types[i % types.length];
      const email = this.generateRealistic({ type, sequenceNumber: i });
      emails.push(email);
    }

    return emails;
  }

  static async loadLabeledTestSet(count: number): Promise<(TestEmail & { expectedRoute: string })[]> {
    const emails = await this.loadTestDataset(count);

    return emails.map(email => ({
      ...email,
      expectedRoute: this.getExpectedRoute(email.metadata?.expectedIntent || 'general')
    }));
  }

  private static getExpectedRoute(intent: string): string {
    const routeMap = {
      'support': 'support@company.com',
      'sales': 'sales@company.com',
      'hr': 'hr@company.com',
      'legal': 'legal@company.com',
      'spam': 'security@company.com',
      'general': 'general@company.com'
    };
    return routeMap[intent] || 'general@company.com';
  }
}