var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { injectable, inject } from 'inversify';
import { EventEmitter } from 'events';
import { Logger } from './Logger.js';
import { MetricsCollector } from './MetricsCollector.js';
import { TYPES } from '../types/container.js';
let HealthChecker = class HealthChecker extends EventEmitter {
    agentOrchestrator;
    pipelineOrchestrator;
    metricsCollector;
    logger;
    checks = new Map();
    lastHealthStatus = null;
    healthCheckInterval = null;
    isRunning = false;
    constructor(agentOrchestrator, pipelineOrchestrator, metricsCollector) {
        super();
        this.agentOrchestrator = agentOrchestrator;
        this.pipelineOrchestrator = pipelineOrchestrator;
        this.metricsCollector = metricsCollector;
        this.logger = new Logger('HealthChecker');
        this.registerDefaultHealthChecks();
    }
    start(config) {
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
    stop() {
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
    registerHealthCheck(name, checkFunction) {
        this.logger.info('Registering health check', { name });
        this.checks.set(name, checkFunction);
    }
    unregisterHealthCheck(name) {
        this.logger.info('Unregistering health check', { name });
        this.checks.delete(name);
    }
    async getHealthStatus() {
        if (this.lastHealthStatus) {
            return this.lastHealthStatus;
        }
        // If no cached status, perform a fresh check
        const config = {
            interval: 30000,
            timeout: 5000,
            retries: 3,
            enabled: true
        };
        return this.performHealthCheck(config);
    }
    async performHealthCheck(config) {
        const startTime = Date.now();
        const checks = [];
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
                    this.metricsCollector.recordHistogram('health_check_duration_ms', checkResult.responseTime, [10, 50, 100, 500, 1000], { check: name });
                }
            }
            catch (error) {
                const failedCheck = {
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
        const systemHealth = {
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
    calculateOverallHealth(checks) {
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
    async executeWithTimeout(fn, timeout) {
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
    registerDefaultHealthChecks() {
        // Database connectivity check
        this.registerHealthCheck('database', async () => {
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
            }
            catch (error) {
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
        this.registerHealthCheck('memory', async () => {
            const startTime = Date.now();
            const memUsage = process.memoryUsage();
            const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
            const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
            const usagePercent = (heapUsedMB / heapTotalMB) * 100;
            let status = 'healthy';
            let message = `Memory usage: ${heapUsedMB.toFixed(2)}MB (${usagePercent.toFixed(1)}%)`;
            if (usagePercent > 90) {
                status = 'unhealthy';
                message += ' - Critical memory usage';
            }
            else if (usagePercent > 80) {
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
        this.registerHealthCheck('agent_orchestrator', async () => {
            const startTime = Date.now();
            try {
                const metrics = await this.agentOrchestrator.getMetrics();
                let status = 'healthy';
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
            }
            catch (error) {
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
        this.registerHealthCheck('pipeline_orchestrator', async () => {
            const startTime = Date.now();
            try {
                const pipelines = await this.pipelineOrchestrator.listPipelines();
                let status = 'healthy';
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
            }
            catch (error) {
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
};
HealthChecker = __decorate([
    injectable(),
    __param(0, inject(TYPES.AgentOrchestrator)),
    __param(1, inject(TYPES.PipelineOrchestrator)),
    __param(2, inject(TYPES.MetricsCollector)),
    __metadata("design:paramtypes", [Object, Object, MetricsCollector])
], HealthChecker);
export { HealthChecker };
//# sourceMappingURL=HealthChecker.js.map