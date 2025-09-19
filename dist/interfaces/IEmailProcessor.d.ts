import type { Email, EmailContext } from '../types/email.js';
import type { ProcessingResult } from '../types/pipeline.js';
export interface IEmailProvider {
    /**
     * Connect to email service
     */
    connect(): Promise<void>;
    /**
     * Disconnect from email service
     */
    disconnect(): Promise<void>;
    /**
     * Fetch new emails
     */
    fetchEmails(since?: Date): Promise<Email[]>;
    /**
     * Get email by ID
     */
    getEmail(id: string): Promise<Email | null>;
    /**
     * Send email
     */
    sendEmail(email: Partial<Email>): Promise<string>;
    /**
     * Mark email as read
     */
    markAsRead(id: string): Promise<void>;
    /**
     * Move email to folder
     */
    moveToFolder(id: string, folder: string): Promise<void>;
    /**
     * Add labels to email
     */
    addLabels(id: string, labels: string[]): Promise<void>;
}
export interface IEmailProcessor {
    /**
     * Process a single email
     */
    processEmail(email: Email): Promise<ProcessingResult>;
    /**
     * Process multiple emails in batch
     */
    processBatch(emails: Email[]): Promise<ProcessingResult[]>;
    /**
     * Get processing status
     */
    getProcessingStatus(): Promise<{
        queued: number;
        processing: number;
        completed: number;
        failed: number;
    }>;
    /**
     * Start the email processor
     */
    start(): Promise<void>;
    /**
     * Stop the email processor
     */
    stop(): Promise<void>;
}
export interface IEmailContextBuilder {
    /**
     * Build context for an email
     */
    buildContext(email: Email): Promise<EmailContext>;
    /**
     * Enrich context with additional data
     */
    enrichContext(context: EmailContext): Promise<EmailContext>;
}
//# sourceMappingURL=IEmailProcessor.d.ts.map