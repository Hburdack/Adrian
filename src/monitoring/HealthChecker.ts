import { injectable, inject } from 'inversify';
import { EventEmitter } from 'events';
import type { IPipelineOrchestrator } from '../interfaces/IPipeline.js';
import type { IAgentOrchestrator } from '../interfaces/IAgentOrchestrator.js';
import { Logger } from './Logger.js';
import { MetricsCollector } from './MetricsCollector.js';
import { TYPES } from '../types/container.js';

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  timestamp: Date;
  responseTime?: number;
  metadata?: Record<string, any>;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  timestamp: Date;
  uptime: number;
  version: string;
}

export interface HealthCheckConfig {
  interval: number; // in milliseconds
  timeout: number; // in milliseconds
  retries: number;
  enabled: boolean;
}

@injectable()
export class HealthChecker extends EventEmitter {
  private logger: Logger;
  private checks = new Map<string, () => Promise<HealthCheck>>();
  private lastHealthStatus: SystemHealth | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    @inject(TYPES.AgentOrchestrator) private agentOrchestrator: IAgentOrchestrator,
    @inject(TYPES.PipelineOrchestrator) private pipelineOrchestrator: IPipelineOrchestrator,
    @inject(TYPES.MetricsCollector) private metricsCollector: MetricsCollector
  ) {
    super();
    this.logger = new Logger('HealthChecker');
    this.registerDefaultHealthChecks();
  }

  start(config: HealthCheckConfig): void {
    if (this.isRunning) {
      this.logger.warn('Health checker is already running');
      return;
    }

    if (!config.enabled) {
      this.logger.info('Health checker is disabled');
      return;
    }

    this.logger.info('Starting health checker', {
      interval: config.interval,
      timeout: config.timeout,
      retries: config.retries
    });

    this.isRunning = true;

    // Perform initial health check
    this.performHealthCheck(config).catch(error => {
      this.logger.error('Initial health check failed', { error: error.message });
    });

    // Schedule periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck(config).catch(error => {
        this.logger.error('Scheduled health check failed', { error: error.message });
      });
    }, config.interval);

    this.logger.info('Health checker started successfully');
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping health checker');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.isRunning = false;
    this.logger.info('Health checker stopped');
  }

  registerHealthCheck(name: string, checkFunction: () => Promise<HealthCheck>): void {
    this.logger.info('Registering health check', { name });
    this.checks.set(name, checkFunction);
  }

  unregisterHealthCheck(name: string): void {
    this.logger.info('Unregistering health check', { name });
    this.checks.delete(name);
  }

  async getHealthStatus(): Promise<SystemHealth> {
    if (this.lastHealthStatus) {
      return this.lastHealthStatus;
    }

    // If no cached status, perform a fresh check
    const config: HealthCheckConfig = {
      interval: 30000,
      timeout: 5000,
      retries: 3,
      enabled: true
    };

    return this.performHealthCheck(config);
  }

  private async performHealthCheck(config: HealthCheckConfig): Promise<SystemHealth> {
    const startTime = Date.now();
    const checks: HealthCheck[] = [];

    this.logger.debug('Performing health check', { totalChecks: this.checks.size });

    // Execute all health checks
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, checkFn]) => {
      try {
        const checkResult = await this.executeWithTimeout(checkFn, config.timeout);
        checks.push(checkResult);

        this.metricsCollector.incrementCounter('health_checks_total', 1, {
          check: name,
          status: checkResult.status
        });

        if (checkResult.responseTime) {
          this.metricsCollector.recordHistogram('health_check_duration_ms', checkResult.responseTime,
            [10, 50, 100, 500, 1000], { check: name });
        }

      } catch (error) {
        const failedCheck: HealthCheck = {
          name,
          status: 'unhealthy',
          message: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          responseTime: Date.now() - startTime
        };

        checks.push(failedCheck);
        this.metricsCollector.incrementCounter('health_checks_total', 1, {
          check: name,
          status: 'unhealthy'
        });

        this.logger.error('Health check failed', {
          check: name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    await Promise.all(checkPromises);

    // Determine overall health status
    const overall = this.calculateOverallHealth(checks);

    const systemHealth: SystemHealth = {
      overall,
      checks,
      timestamp: new Date(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };

    this.lastHealthStatus = systemHealth;

    // Emit health status change event
    this.emit('healthCheck', systemHealth);

    // Log health status
    this.logger.info('Health check completed', {
      overall,
      totalChecks: checks.length,
      healthyChecks: checks.filter(c => c.status === 'healthy').length,
      degradedChecks: checks.filter(c => c.status === 'degraded').length,
      unhealthyChecks: checks.filter(c => c.status === 'unhealthy').length,
      duration: Date.now() - startTime
    });

    return systemHealth;
  }

  private calculateOverallHealth(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
    if (checks.length === 0) {
      return 'unhealthy';
    }

    const unhealthyCount = checks.filter(check => check.status === 'unhealthy').length;
    const degradedCount = checks.filter(check => check.status === 'degraded').length;

    // If more than 50% of checks are unhealthy, system is unhealthy
    if (unhealthyCount > checks.length * 0.5) {
      return 'unhealthy';
    }

    // If any checks are unhealthy or degraded, system is degraded
    if (unhealthyCount > 0 || degradedCount > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Health check timed out after ${timeout}ms`));
      }, timeout);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  private registerDefaultHealthChecks(): void {
    // Database connectivity check
    this.registerHealthCheck('database', async (): Promise<HealthCheck> => {
      const startTime = Date.now();

      try {
        // Simulate database check - replace with actual database connectivity test
        await new Promise(resolve => setTimeout(resolve, 10));

        return {
          name: 'database',
          status: 'healthy',
          message: 'Database connection is healthy',
          timestamp: new Date(),
          responseTime: Date.now() - startTime
        };
      } catch (error) {
        return {
          name: 'database',
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Database check failed',
          timestamp: new Date(),
          responseTime: Date.now() - startTime
        };
      }
    });

    // Memory usage check
    this.registerHealthCheck('memory', async (): Promise<HealthCheck> => {
      const startTime = Date.now();
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
      const usagePercent = (heapUsedMB / heapTotalMB) * 100;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message = `Memory usage: ${heapUsedMB.toFixed(2)}MB (${usagePercent.toFixed(1)}%)`;

      if (usagePercent > 90) {
        status = 'unhealthy';
        message += ' - Critical memory usage';
      } else if (usagePercent > 80) {
        status = 'degraded';
        message += ' - High memory usage';
      }

      return {
        name: 'memory',
        status,
        message,
        timestamp: new Date(),
        responseTime: Date.now() - startTime,
        metadata: {
          heapUsedMB: Math.round(heapUsedMB),
          heapTotalMB: Math.round(heapTotalMB),
          usagePercent: Math.round(usagePercent)
        }
      };
    });

    // Agent orchestrator health check
    this.registerHealthCheck('agent_orchestrator', async (): Promise<HealthCheck> => {
      const startTime = Date.now();

      try {
        const metrics = await this.agentOrchestrator.getMetrics();

        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        let message = `Agent orchestrator: ${metrics.totalAgents} agents, ${metrics.activeAgents} active`;

        if (metrics.totalAgents === 0) {
          status = 'degraded';
          message += ' - No agents registered';
        }

        return {
          name: 'agent_orchestrator',
          status,
          message,
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
          metadata: metrics
        };
      } catch (error) {
        return {
          name: 'agent_orchestrator',
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Agent orchestrator check failed',
          timestamp: new Date(),
          responseTime: Date.now() - startTime
        };
      }
    });

    // Pipeline orchestrator health check
    this.registerHealthCheck('pipeline_orchestrator', async (): Promise<HealthCheck> => {
      const startTime = Date.now();

      try {
        const pipelines = await this.pipelineOrchestrator.listPipelines();

        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        let message = `Pipeline orchestrator: ${pipelines.length} pipelines registered`;

        if (pipelines.length === 0) {
          status = 'degraded';
          message += ' - No pipelines registered';
        }

        return {
          name: 'pipeline_orchestrator',
          status,
          message,
          timestamp: new Date(),
          responseTime: Date.now() - startTime,
          metadata: {
            totalPipelines: pipelines.length
          }
        };
      } catch (error) {
        return {
          name: 'pipeline_orchestrator',
          status: 'unhealthy',
          message: error instanceof Error ? error.message : 'Pipeline orchestrator check failed',
          timestamp: new Date(),
          responseTime: Date.now() - startTime
        };
      }
    });

    this.logger.info('Default health checks registered', {
      totalChecks: this.checks.size
    });
  }
}