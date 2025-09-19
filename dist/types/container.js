export const TYPES = {
    // Core services
    Logger: Symbol.for('Logger'),
    Configuration: Symbol.for('Configuration'),
    // Email processing
    EmailProvider: Symbol.for('EmailProvider'),
    EmailProcessor: Symbol.for('EmailProcessor'),
    EmailContextBuilder: Symbol.for('EmailContextBuilder'),
    // Agent system
    Agent: Symbol.for('Agent'),
    AgentFactory: Symbol.for('AgentFactory'),
    AgentOrchestrator: Symbol.for('AgentOrchestrator'),
    // Pipeline system
    Pipeline: Symbol.for('Pipeline'),
    PipelineOrchestrator: Symbol.for('PipelineOrchestrator'),
    // Monitoring
    MetricsCollector: Symbol.for('MetricsCollector'),
    HealthChecker: Symbol.for('HealthChecker'),
    // Storage
    Repository: Symbol.for('Repository'),
    Cache: Symbol.for('Cache')
};
//# sourceMappingURL=container.js.map