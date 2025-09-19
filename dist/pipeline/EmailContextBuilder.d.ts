import type { Email, EmailContext } from '../types/email.js';
import type { IEmailContextBuilder } from '../interfaces/IEmailProcessor.js';
export declare class EmailContextBuilder implements IEmailContextBuilder {
    private logger;
    constructor();
    buildContext(email: Email): Promise<EmailContext>;
    enrichContext(context: EmailContext): Promise<EmailContext>;
    private getConversationHistory;
    private getUserProfile;
    private getOrganizationContext;
    private getDefaultUserPreferences;
    private extractNameFromEmail;
    private isReply;
    private isForward;
    private calculateReadingTime;
    private detectLanguage;
    private analyzeSentiment;
}
//# sourceMappingURL=EmailContextBuilder.d.ts.map