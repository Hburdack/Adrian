export interface LogContext {
    [key: string]: any;
}
export declare class Logger {
    private winstonLogger;
    private context;
    constructor(context?: string);
    private createLogger;
    debug(message: string, meta?: LogContext): void;
    info(message: string, meta?: LogContext): void;
    warn(message: string, meta?: LogContext): void;
    error(message: string, meta?: LogContext): void;
    fatal(message: string, meta?: LogContext): void;
    time(label: string): void;
    timeEnd(label: string): void;
    logRequest(method: string, url: string, statusCode: number, duration: number, meta?: LogContext): void;
    logTaskExecution(taskId: string, agentId: string, duration: number, success: boolean, meta?: LogContext): void;
    logPipelineExecution(pipelineId: string, emailId: string, duration: number, status: string, meta?: LogContext): void;
    logMetrics(metrics: Record<string, number | string>, meta?: LogContext): void;
    logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', meta?: LogContext): void;
    logAuthAttempt(email: string, success: boolean, ip?: string, userAgent?: string): void;
    logEmailReceived(emailId: string, from: string, subject: string, meta?: LogContext): void;
    logEmailProcessed(emailId: string, pipelineId: string, result: string, confidence: number, meta?: LogContext): void;
    logAgentAction(agentId: string, action: string, emailId?: string, meta?: LogContext): void;
    logCorrelatedError(correlationId: string, error: Error, meta?: LogContext): void;
    child(additionalContext: LogContext): Logger;
    destroy(): void;
}
//# sourceMappingURL=Logger.d.ts.map