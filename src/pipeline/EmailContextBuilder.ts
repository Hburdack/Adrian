import { injectable } from 'inversify';
import type {
  Email,
  EmailContext,
  UserProfile,
  OrganizationContext,
  UserPreferences
} from '../types/email.js';
import type { IEmailContextBuilder } from '../interfaces/IEmailProcessor.js';
import { Logger } from '../monitoring/Logger.js';

@injectable()
export class EmailContextBuilder implements IEmailContextBuilder {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('EmailContextBuilder');
  }

  async buildContext(email: Email): Promise<EmailContext> {
    this.logger.debug('Building email context', {
      emailId: email.id,
      from: email.from.email
    });

    const context: EmailContext = {
      email,
      conversationHistory: await this.getConversationHistory(email)
    };

    const userProfile = await this.getUserProfile(email.from.email);
    const organizationContext = await this.getOrganizationContext(email);

    if (userProfile) {
      context.userProfile = userProfile;
    }

    if (organizationContext) {
      context.organizationContext = organizationContext;
    }

    // Enrich the context with additional data
    return this.enrichContext(context);
  }

  async enrichContext(context: EmailContext): Promise<EmailContext> {
    this.logger.debug('Enriching email context', {
      emailId: context.email.id
    });

    // Add any additional enrichment logic here
    // For example: sentiment analysis, language detection, etc.

    // Analyze email patterns
    const enrichedContext = {
      ...context,
      email: {
        ...context.email,
        metadata: {
          ...context.email.metadata,
          // Add computed metadata
          isReply: this.isReply(context.email),
          isForward: this.isForward(context.email),
          hasAttachments: context.email.attachments.length > 0,
          estimatedReadingTime: this.calculateReadingTime(context.email),
          language: await this.detectLanguage(context.email),
          sentiment: await this.analyzeSentiment(context.email)
        }
      }
    };

    return enrichedContext;
  }

  private async getConversationHistory(email: Email): Promise<Email[]> {
    // In a real implementation, this would query the database for related emails
    // based on thread ID, subject line, or other correlation methods

    const history: Email[] = [];

    // Mock implementation - find emails with similar subject or thread ID
    if (email.metadata.threadId) {
      // Query database for emails with same thread ID
      this.logger.debug('Fetching conversation history by thread ID', {
        threadId: email.metadata.threadId
      });
    } else if (email.subject.toLowerCase().includes('re:') || email.subject.toLowerCase().includes('fwd:')) {
      // Try to find related emails by subject
      this.logger.debug('Fetching conversation history by subject', {
        subject: email.subject
      });
    }

    return history;
  }

  private async getUserProfile(emailAddress: string): Promise<UserProfile | undefined> {
    // In a real implementation, this would query user database or directory service

    this.logger.debug('Fetching user profile', { email: emailAddress });

    // Mock user profile
    const mockProfile: UserProfile = {
      id: `user-${emailAddress}`,
      email: emailAddress,
      name: this.extractNameFromEmail(emailAddress),
      department: 'Unknown',
      role: 'User',
      preferences: this.getDefaultUserPreferences()
    };

    return mockProfile;
  }

  private async getOrganizationContext(email: Email): Promise<OrganizationContext | undefined> {
    // Extract domain from sender's email
    const domain = email.from.email.split('@')[1];
    if (!domain) {
      return undefined;
    }

    this.logger.debug('Building organization context', { domain });

    // Mock organization context
    const orgContext: OrganizationContext = {
      domain,
      policies: [],
      knowledgeBase: [],
      templates: []
    };

    return orgContext;
  }

  private getDefaultUserPreferences(): UserPreferences {
    return {
      autoReply: false,
      responseStyle: 'professional',
      priorityKeywords: ['urgent', 'asap', 'important'],
      blacklistedSenders: [],
      whitelistedSenders: []
    };
  }

  private extractNameFromEmail(email: string): string {
    // Simple name extraction from email
    const localPart = email.split('@')[0];
    if (!localPart) return email;

    // Replace dots and underscores with spaces and capitalize
    return localPart
      .replace(/[._]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private isReply(email: Email): boolean {
    return email.subject.toLowerCase().startsWith('re:') ||
           email.metadata.inReplyTo !== undefined ||
           email.metadata.references !== undefined;
  }

  private isForward(email: Email): boolean {
    return email.subject.toLowerCase().startsWith('fwd:') ||
           email.subject.toLowerCase().startsWith('fw:');
  }

  private calculateReadingTime(email: Email): number {
    // Calculate estimated reading time in minutes
    const text = email.body.text || '';
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  private async detectLanguage(email: Email): Promise<string> {
    // Mock language detection - in reality, you'd use a proper language detection library
    const text = (email.body.text || email.subject).toLowerCase();

    // Simple heuristic-based detection
    const commonWords = {
      en: ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with'],
      es: ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se'],
      fr: ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir'],
      de: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich']
    };

    for (const [lang, words] of Object.entries(commonWords)) {
      const matches = words.filter(word => text.includes(word)).length;
      if (matches >= 3) {
        return lang;
      }
    }

    return 'en'; // Default to English
  }

  private async analyzeSentiment(email: Email): Promise<'positive' | 'neutral' | 'negative'> {
    // Mock sentiment analysis - in reality, you'd use a proper sentiment analysis service
    const text = (email.body.text || email.subject).toLowerCase();

    const positiveWords = ['thank', 'great', 'excellent', 'wonderful', 'good', 'pleased', 'happy'];
    const negativeWords = ['problem', 'issue', 'urgent', 'error', 'failed', 'wrong', 'bad'];

    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;

    if (positiveCount > negativeCount) {
      return 'positive';
    } else if (negativeCount > positiveCount) {
      return 'negative';
    } else {
      return 'neutral';
    }
  }
}