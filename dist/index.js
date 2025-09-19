import 'reflect-metadata';
import { container } from './container/container.js';
import { Logger } from './monitoring/Logger.js';
import { TYPES } from './types/container.js';
// Import for side effects
import './container/container.js';
export class ZetifyEmailTriageSystem {
    logger;
    configuration;
    metricsCollector;
    healthChecker;
    agentOrchestrator;
    pipelineOrchestrator;
    emailProcessor;
    isInitialized = false;
    isRunning = false;
    constructor() {
        this.logger = new Logger('ZetifyEmailTriageSystem');
    }
    async initialize() {
        if (this.isInitialized) {
            this.logger.warn('System is already initialized');
            return;
        }
        this.logger.info('Initializing Zetify Email Triage System');
        try {
            // Get services from container
            this.configuration = container.get(TYPES.Configuration);
            this.metricsCollector = container.get(TYPES.MetricsCollector);
            this.healthChecker = container.get(TYPES.HealthChecker);
            this.agentOrchestrator = container.get(TYPES.AgentOrchestrator);
            this.pipelineOrchestrator = container.get(TYPES.PipelineOrchestrator);
            this.emailProcessor = container.get(TYPES.EmailProcessor);
            // Initialize configuration
            await this.configuration.initialize();
            const config = this.configuration.getConfig();
            this.logger.info('System initialized successfully', {
                environment: config.app.environment,
                version: config.app.version
            });
            this.isInitialized = true;
        }
        catch (error) {
            this.logger.error('Failed to initialize system', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async start() {
        if (!this.isInitialized) {
            throw new Error('System must be initialized before starting');
        }
        if (this.isRunning) {
            this.logger.warn('System is already running');
            return;
        }
        this.logger.info('Starting Zetify Email Triage System');
        try {
            const config = this.configuration.getConfig();
            // Start monitoring
            if (config.monitoring.enabled) {
                this.healthChecker.start({
                    interval: config.monitoring.healthCheckInterval * 1000,
                    timeout: 5000,
                    retries: 3,
                    enabled: true
                });
            }
            // Start email processor
            await this.emailProcessor.start();
            // Register health check events
            this.healthChecker.on('healthCheck', (health) => {
                this.logger.debug('Health check completed', {
                    overall: health.overall,
                    totalChecks: health.checks.length
                });
                if (health.overall === 'unhealthy') {
                    this.logger.error('System health is unhealthy', {
                        unhealthyChecks: health.checks
                            .filter(check => check.status === 'unhealthy')
                            .map(check => ({ name: check.name, message: check.message }))
                    });
                }
            });
            this.isRunning = true;
            this.logger.info('Zetify Email Triage System started successfully', {
                monitoring: config.monitoring.enabled,
                agentCount: config.agents.length,
                pipelineCount: config.pipelines.length
            });
        }
        catch (error) {
            this.logger.error('Failed to start system', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async stop() {
        if (!this.isRunning) {
            return;
        }
        this.logger.info('Stopping Zetify Email Triage System');
        try {
            // Stop email processor
            await this.emailProcessor.stop();
            // Stop health checker
            this.healthChecker.stop();
            // Shutdown agent orchestrator
            await this.agentOrchestrator.shutdown();
            this.isRunning = false;
            this.logger.info('Zetify Email Triage System stopped successfully');
        }
        catch (error) {
            this.logger.error('Error during system shutdown', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async getSystemStatus() {
        const health = this.isInitialized && this.isRunning
            ? await this.healthChecker.getHealthStatus()
            : null;
        const metrics = this.isInitialized
            ? this.metricsCollector.getSummary()
            : null;
        const config = this.isInitialized
            ? this.configuration.getConfig()
            : null;
        return {
            initialized: this.isInitialized,
            running: this.isRunning,
            health,
            metrics,
            configuration: config ? {
                environment: config.app.environment,
                version: config.app.version,
                logLevel: config.app.logLevel,
                monitoring: config.monitoring.enabled
            } : null
        };
    }
    // Expose key services for external access
    getAgentOrchestrator() {
        if (!this.isInitialized) {
            throw new Error('System not initialized');
        }
        return this.agentOrchestrator;
    }
    getPipelineOrchestrator() {
        if (!this.isInitialized) {
            throw new Error('System not initialized');
        }
        return this.pipelineOrchestrator;
    }
    getEmailProcessor() {
        if (!this.isInitialized) {
            throw new Error('System not initialized');
        }
        return this.emailProcessor;
    }
    getMetricsCollector() {
        if (!this.isInitialized) {
            throw new Error('System not initialized');
        }
        return this.metricsCollector;
    }
    getConfiguration() {
        if (!this.isInitialized) {
            throw new Error('System not initialized');
        }
        return this.configuration;
    }
}
export const zetifySystem = new ZetifyEmailTriageSystem();
// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
    async function main() {
        const logger = new Logger('Main');
        try {
            logger.info('Starting Zetify Email Triage System');
            await zetifySystem.initialize();
            await zetifySystem.start();
            // Graceful shutdown handling
            const shutdown = async (signal) => {
                logger.info(`Received ${signal}, shutting down gracefully`);
                try {
                    await zetifySystem.stop();
                    process.exit(0);
                }
                catch (error) {
                    logger.error('Error during shutdown', { error });
                    process.exit(1);
                }
            };
            process.on('SIGTERM', () => shutdown('SIGTERM'));
            process.on('SIGINT', () => shutdown('SIGINT'));
            logger.info('System is running. Press Ctrl+C to stop.');
        }
        catch (error) {
            logger.error('Failed to start system', {
                error: error instanceof Error ? error.message : String(error)
            });
            process.exit(1);
        }
    }
    main().catch(console.error);
}
//# sourceMappingURL=index.js.map