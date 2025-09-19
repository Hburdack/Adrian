import 'reflect-metadata';
import { Container } from 'inversify';
import { TYPES } from '../types/container.js';
// Core services
import { Configuration } from '../config/Configuration.js';
import { Logger } from '../monitoring/Logger.js';
import { MetricsCollector } from '../monitoring/MetricsCollector.js';
import { HealthChecker } from '../monitoring/HealthChecker.js';
// Agent system
import { AgentFactory } from '../orchestration/AgentFactory.js';
import { AgentOrchestrator } from '../orchestration/AgentOrchestrator.js';
import { PipelineOrchestrator } from '../pipeline/PipelineOrchestrator.js';
// Email processing
import { EmailProcessor } from '../pipeline/EmailProcessor.js';
import { EmailContextBuilder } from '../pipeline/EmailContextBuilder.js';
export function createContainer() {
    const container = new Container();
    // Core services
    container.bind(TYPES.Configuration).to(Configuration).inSingletonScope();
    container.bind(TYPES.Logger).to(Logger);
    container.bind(TYPES.MetricsCollector).to(MetricsCollector).inSingletonScope();
    container.bind(TYPES.HealthChecker).to(HealthChecker).inSingletonScope();
    // Agent system
    container.bind(TYPES.AgentFactory).to(AgentFactory).inSingletonScope();
    container.bind(TYPES.AgentOrchestrator).to(AgentOrchestrator).inSingletonScope();
    // Pipeline system
    container.bind(TYPES.PipelineOrchestrator).to(PipelineOrchestrator).inSingletonScope();
    // Email processing
    container.bind(TYPES.EmailProcessor).to(EmailProcessor).inSingletonScope();
    container.bind(TYPES.EmailContextBuilder).to(EmailContextBuilder).inSingletonScope();
    return container;
}
export const container = createContainer();
//# sourceMappingURL=container.js.map