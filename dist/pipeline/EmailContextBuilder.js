var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { injectable } from 'inversify';
import { Logger } from '../monitoring/Logger.js';
let EmailContextBuilder = class EmailContextBuilder {
    logger;
    constructor() {
        this.logger = new Logger('EmailContextBuilder');
    }
    async buildContext(email) {
        this.logger.debug('Building email context', {
            emailId: email.id,
            from: email.from.email
        });
        const context = {
            email,
            conversationHistory: await this.getConversationHistory(email),
            userProfile: await this.getUserProfile(email.from.email),
            organizationContext: await this.getOrganizationContext(email)
        };
        // Enrich the context with additional data
        return this.enrichContext(context);
    }
    async enrichContext(context) {
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
    async getConversationHistory(email) {
        // In a real implementation, this would query the database for related emails
        // based on thread ID, subject line, or other correlation methods
        const history = [];
        // Mock implementation - find emails with similar subject or thread ID
        if (email.metadata.threadId) {
            // Query database for emails with same thread ID
            this.logger.debug('Fetching conversation history by thread ID', {
                threadId: email.metadata.threadId
            });
        }
        else if (email.subject.toLowerCase().includes('re:') || email.subject.toLowerCase().includes('fwd:')) {
            // Try to find related emails by subject
            this.logger.debug('Fetching conversation history by subject', {
                subject: email.subject
            });
        }
        return history;
    }
    async getUserProfile(emailAddress) {
        // In a real implementation, this would query user database or directory service
        this.logger.debug('Fetching user profile', { email: emailAddress });
        // Mock user profile
        const mockProfile = {
            id: `user-${emailAddress}`,
            email: emailAddress,
            name: this.extractNameFromEmail(emailAddress),
            department: 'Unknown',
            role: 'User',
            preferences: this.getDefaultUserPreferences()
        };
        return mockProfile;
    }
    async getOrganizationContext(email) {
        // Extract domain from sender's email
        const domain = email.from.email.split('@')[1];
        if (!domain) {
            return undefined;
        }
        this.logger.debug('Building organization context', { domain });
        // Mock organization context
        const orgContext = {
            domain,
            policies: [],
            knowledgeBase: [],
            templates: []
        };
        return orgContext;
    }
    getDefaultUserPreferences() {
        return {
            autoReply: false,
            responseStyle: 'professional',
            priorityKeywords: ['urgent', 'asap', 'important'],
            blacklistedSenders: [],
            whitelistedSenders: []
        };
    }
    extractNameFromEmail(email) {
        // Simple name extraction from email
        const localPart = email.split('@')[0];
        if (!localPart)
            return email;
        // Replace dots and underscores with spaces and capitalize
        return localPart
            .replace(/[._]/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    isReply(email) {
        return email.subject.toLowerCase().startsWith('re:') ||
            email.metadata.inReplyTo !== undefined ||
            email.metadata.references !== undefined;
    }
    isForward(email) {
        return email.subject.toLowerCase().startsWith('fwd:') ||
            email.subject.toLowerCase().startsWith('fw:');
    }
    calculateReadingTime(email) {
        // Calculate estimated reading time in minutes
        const text = email.body.text || '';
        const wordsPerMinute = 200;
        const wordCount = text.split(/\s+/).length;
        return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
    }
    async detectLanguage(email) {
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
    async analyzeSentiment(email) {
        // Mock sentiment analysis - in reality, you'd use a proper sentiment analysis service
        const text = (email.body.text || email.subject).toLowerCase();
        const positiveWords = ['thank', 'great', 'excellent', 'wonderful', 'good', 'pleased', 'happy'];
        const negativeWords = ['problem', 'issue', 'urgent', 'error', 'failed', 'wrong', 'bad'];
        const positiveCount = positiveWords.filter(word => text.includes(word)).length;
        const negativeCount = negativeWords.filter(word => text.includes(word)).length;
        if (positiveCount > negativeCount) {
            return 'positive';
        }
        else if (negativeCount > positiveCount) {
            return 'negative';
        }
        else {
            return 'neutral';
        }
    }
};
EmailContextBuilder = __decorate([
    injectable(),
    __metadata("design:paramtypes", [])
], EmailContextBuilder);
export { EmailContextBuilder };
//# sourceMappingURL=EmailContextBuilder.js.map