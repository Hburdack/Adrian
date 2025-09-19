import winston from 'winston';
import * as path from 'path';
export class Logger {
    winstonLogger;
    context;
    constructor(context = 'Application') {
        this.context = context;
        this.winstonLogger = this.createLogger();
    }
    createLogger() {
        const logLevel = process.env.LOG_LEVEL || 'info';
        const environment = process.env.NODE_ENV || 'development';
        const formats = [
            winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss.SSS'
            }),
            winston.format.errors({ stack: true }),
            winston.format.json()
        ];
        if (environment === 'development') {
            formats.push(winston.format.colorize({ all: true }), winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                const contextStr = context || this.context;
                const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
                return `${timestamp} [${level}] [${contextStr}] ${message} ${metaStr}`;
            }));
        }
        const transports = [
            new winston.transports.Console({
                level: logLevel,
                format: winston.format.combine(...formats)
            })
        ];
        // Add file transports in production
        if (environment === 'production') {
            const logsDir = process.env.LOGS_DIR || path.join(process.cwd(), 'logs');
            transports.push(new winston.transports.File({
                filename: path.join(logsDir, 'error.log'),
                level: 'error',
                format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
                maxsize: 5242880, // 5MB
                maxFiles: 5
            }), new winston.transports.File({
                filename: path.join(logsDir, 'combined.log'),
                format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
                maxsize: 5242880, // 5MB
                maxFiles: 5
            }));
        }
        return winston.createLogger({
            level: logLevel,
            format: winston.format.combine(...formats),
            transports,
            exitOnError: false,
            defaultMeta: {
                service: 'zetify-email-triage',
                context: this.context
            }
        });
    }
    debug(message, meta) {
        this.winstonLogger.debug(message, { context: this.context, ...meta });
    }
    info(message, meta) {
        this.winstonLogger.info(message, { context: this.context, ...meta });
    }
    warn(message, meta) {
        this.winstonLogger.warn(message, { context: this.context, ...meta });
    }
    error(message, meta) {
        this.winstonLogger.error(message, { context: this.context, ...meta });
    }
    fatal(message, meta) {
        this.winstonLogger.error(message, { context: this.context, level: 'fatal', ...meta });
    }
    // Performance logging
    time(label) {
        console.time(`${this.context}:${label}`);
    }
    timeEnd(label) {
        console.timeEnd(`${this.context}:${label}`);
    }
    // Structured logging methods
    logRequest(method, url, statusCode, duration, meta) {
        this.info('HTTP Request', {
            method,
            url,
            statusCode,
            duration,
            ...meta
        });
    }
    logTaskExecution(taskId, agentId, duration, success, meta) {
        this.info('Task Execution', {
            taskId,
            agentId,
            duration,
            success,
            ...meta
        });
    }
    logPipelineExecution(pipelineId, emailId, duration, status, meta) {
        this.info('Pipeline Execution', {
            pipelineId,
            emailId,
            duration,
            status,
            ...meta
        });
    }
    logMetrics(metrics, meta) {
        this.info('Metrics', {
            ...metrics,
            ...meta
        });
    }
    // Security logging
    logSecurityEvent(event, severity, meta) {
        this.warn('Security Event', {
            event,
            severity,
            timestamp: new Date().toISOString(),
            ...meta
        });
    }
    logAuthAttempt(email, success, ip, userAgent) {
        this.info('Authentication Attempt', {
            email,
            success,
            ip,
            userAgent,
            timestamp: new Date().toISOString()
        });
    }
    // Email processing specific logging
    logEmailReceived(emailId, from, subject, meta) {
        this.info('Email Received', {
            emailId,
            from,
            subject: subject.substring(0, 100), // Truncate long subjects
            ...meta
        });
    }
    logEmailProcessed(emailId, pipelineId, result, confidence, meta) {
        this.info('Email Processed', {
            emailId,
            pipelineId,
            result,
            confidence,
            ...meta
        });
    }
    logAgentAction(agentId, action, emailId, meta) {
        this.info('Agent Action', {
            agentId,
            action,
            emailId,
            ...meta
        });
    }
    // Error correlation
    logCorrelatedError(correlationId, error, meta) {
        this.error('Correlated Error', {
            correlationId,
            error: error.message,
            stack: error.stack,
            ...meta
        });
    }
    // Create child logger with additional context
    child(additionalContext) {
        const childLogger = new Logger(this.context);
        // Override the winston logger to include additional context
        const originalLog = childLogger.winstonLogger.log.bind(childLogger.winstonLogger);
        childLogger.winstonLogger.log = (level, message, meta = {}) => {
            return originalLog(level, message, { ...additionalContext, ...meta });
        };
        return childLogger;
    }
    // Cleanup method
    destroy() {
        this.winstonLogger.destroy();
    }
}
//# sourceMappingURL=Logger.js.map