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

// Pipeline system
import { PipelineOrchestrator } from '../pipeline/PipelineOrchestrator.js';

// Email processing
import { EmailProcessor } from '../pipeline/EmailProcessor.js';
import { EmailContextBuilder } from '../pipeline/EmailContextBuilder.js';

// Interfaces
import type { IAgentFactory } from '../interfaces/IAgent.js';
import type { IAgentOrchestrator } from '../interfaces/IAgentOrchestrator.js';
import type { IPipelineOrchestrator } from '../interfaces/IPipeline.js';
import type { IEmailProcessor, IEmailContextBuilder } from '../interfaces/IEmailProcessor.js';

export function createContainer(): Container {
  const container = new Container();

  // Core services
  container.bind<Configuration>(TYPES.Configuration).to(Configuration).inSingletonScope();
  container.bind<Logger>(TYPES.Logger).to(Logger);
  container.bind<MetricsCollector>(TYPES.MetricsCollector).to(MetricsCollector).inSingletonScope();
  container.bind<HealthChecker>(TYPES.HealthChecker).to(HealthChecker).inSingletonScope();

  // Agent system
  container.bind<IAgentFactory>(TYPES.AgentFactory).to(AgentFactory).inSingletonScope();
  container.bind<IAgentOrchestrator>(TYPES.AgentOrchestrator).to(AgentOrchestrator).inSingletonScope();

  // Pipeline system
  container.bind<IPipelineOrchestrator>(TYPES.PipelineOrchestrator).to(PipelineOrchestrator).inSingletonScope();

  // Email processing
  container.bind<IEmailProcessor>(TYPES.EmailProcessor).to(EmailProcessor).inSingletonScope();
  container.bind<IEmailContextBuilder>(TYPES.EmailContextBuilder).to(EmailContextBuilder).inSingletonScope();

  return container;
}

export const container = createContainer();