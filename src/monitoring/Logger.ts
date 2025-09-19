import winston from 'winston';
import * as path from 'path';

export interface LogContext {
  [key: string]: any;
}

export class Logger {
  private winstonLogger: winston.Logger;
  private context: string;

  constructor(context: string = 'Application') {
    this.context = context;
    this.winstonLogger = this.createLogger();
  }

  private createLogger(): winston.Logger {
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
      formats.push(
        winston.format.colorize({ all: true }),
        winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
          const contextStr = context || this.context;
          const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}] [${contextStr}] ${message} ${metaStr}`;
        })
      );
    }

    const transports: winston.transport[] = [
      new winston.transports.Console({
        level: logLevel,
        format: winston.format.combine(...formats)
      })
    ];

    // Add file transports in production
    if (environment === 'production') {
      const logsDir = process.env.LOGS_DIR || path.join(process.cwd(), 'logs');

      transports.push(
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: path.join(logsDir, 'combined.log'),
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          ),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      );
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

  debug(message: string, meta?: LogContext): void {
    this.winstonLogger.debug(message, { context: this.context, ...meta });
  }

  info(message: string, meta?: LogContext): void {
    this.winstonLogger.info(message, { context: this.context, ...meta });
  }

  warn(message: string, meta?: LogContext): void {
    this.winstonLogger.warn(message, { context: this.context, ...meta });
  }

  error(message: string, meta?: LogContext): void {
    this.winstonLogger.error(message, { context: this.context, ...meta });
  }

  fatal(message: string, meta?: LogContext): void {
    this.winstonLogger.error(message, { context: this.context, level: 'fatal', ...meta });
  }

  // Performance logging
  time(label: string): void {
    console.time(`${this.context}:${label}`);
  }

  timeEnd(label: string): void {
    console.timeEnd(`${this.context}:${label}`);
  }

  // Structured logging methods
  logRequest(method: string, url: string, statusCode: number, duration: number, meta?: LogContext): void {
    this.info('HTTP Request', {
      method,
      url,
      statusCode,
      duration,
      ...meta
    });
  }

  logTaskExecution(taskId: string, agentId: string, duration: number, success: boolean, meta?: LogContext): void {
    this.info('Task Execution', {
      taskId,
      agentId,
      duration,
      success,
      ...meta
    });
  }

  logPipelineExecution(pipelineId: string, emailId: string, duration: number, status: string, meta?: LogContext): void {
    this.info('Pipeline Execution', {
      pipelineId,
      emailId,
      duration,
      status,
      ...meta
    });
  }

  logMetrics(metrics: Record<string, number | string>, meta?: LogContext): void {
    this.info('Metrics', {
      ...metrics,
      ...meta
    });
  }

  // Security logging
  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', meta?: LogContext): void {
    this.warn('Security Event', {
      event,
      severity,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  logAuthAttempt(email: string, success: boolean, ip?: string, userAgent?: string): void {
    this.info('Authentication Attempt', {
      email,
      success,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }

  // Email processing specific logging
  logEmailReceived(emailId: string, from: string, subject: string, meta?: LogContext): void {
    this.info('Email Received', {
      emailId,
      from,
      subject: subject.substring(0, 100), // Truncate long subjects
      ...meta
    });
  }

  logEmailProcessed(emailId: string, pipelineId: string, result: string, confidence: number, meta?: LogContext): void {
    this.info('Email Processed', {
      emailId,
      pipelineId,
      result,
      confidence,
      ...meta
    });
  }

  logAgentAction(agentId: string, action: string, emailId?: string, meta?: LogContext): void {
    this.info('Agent Action', {
      agentId,
      action,
      emailId,
      ...meta
    });
  }

  // Error correlation
  logCorrelatedError(correlationId: string, error: Error, meta?: LogContext): void {
    this.error('Correlated Error', {
      correlationId,
      error: error.message,
      stack: error.stack,
      ...meta
    });
  }

  // Create child logger with additional context
  child(additionalContext: LogContext): Logger {
    const childLogger = new Logger(this.context);

    // Override the winston logger to include additional context
    const originalLog = childLogger.winstonLogger.log.bind(childLogger.winstonLogger);
    childLogger.winstonLogger.log = ((level: any, message: any, meta: any = {}) => {
      return originalLog(level, message, { ...additionalContext, ...meta });
    }) as any;

    return childLogger;
  }

  // Cleanup method
  destroy(): void {
    this.winstonLogger.destroy();
  }
}