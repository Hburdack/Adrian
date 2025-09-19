import { injectable } from 'inversify';
// import * as Joi from 'joi'; // Removed as not used in this implementation
import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Logger } from '../monitoring/Logger.js';

// Configuration schemas using Zod for runtime validation
export const EmailProviderConfigSchema = z.object({
  type: z.enum(['imap', 'pop3', 'exchange', 'gmail']),
  host: z.string().min(1),
  port: z.number().int().positive(),
  secure: z.boolean(),
  auth: z.object({
    user: z.string().email(),
    pass: z.string().min(1)
  }),
  options: z.record(z.unknown()).optional()
});

export const AgentConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  capabilities: z.array(z.object({
    name: z.string(),
    description: z.string(),
    confidence: z.number().min(0).max(1),
    parameters: z.record(z.unknown()).optional()
  })),
  priority: z.number().int().min(0),
  enabled: z.boolean(),
  maxConcurrentTasks: z.number().int().positive(),
  timeout: z.number().int().positive(),
  retryAttempts: z.number().int().min(0),
  dependencies: z.array(z.string()),
  parameters: z.record(z.unknown())
});

export const PipelineConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  stages: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    agentTypes: z.array(z.string()),
    required: z.boolean(),
    parallel: z.boolean(),
    retryOnFailure: z.boolean(),
    timeout: z.number().int().positive()
  })),
  globalTimeout: z.number().int().positive(),
  failureStrategy: z.enum(['stop', 'continue', 'retry']),
  parallelExecution: z.boolean()
});

export const AppConfigSchema = z.object({
  // Application settings
  app: z.object({
    name: z.string().default('Zetify Email Triage'),
    version: z.string().default('1.0.0'),
    environment: z.enum(['development', 'staging', 'production']).default('development'),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    port: z.number().int().positive().default(3000)
  }),

  // Email provider configuration
  email: EmailProviderConfigSchema,

  // Database configuration
  database: z.object({
    type: z.enum(['sqlite', 'postgresql', 'mysql']),
    host: z.string().optional(),
    port: z.number().int().positive().optional(),
    database: z.string().min(1),
    username: z.string().optional(),
    password: z.string().optional(),
    ssl: z.boolean().default(false),
    poolSize: z.number().int().positive().default(10)
  }),

  // Redis configuration for caching
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.number().int().positive().default(6379),
    password: z.string().optional(),
    db: z.number().int().min(0).default(0)
  }).optional(),

  // Agent configurations
  agents: z.array(AgentConfigSchema),

  // Pipeline configurations
  pipelines: z.array(PipelineConfigSchema),

  // Security settings
  security: z.object({
    jwtSecret: z.string().min(32),
    bcryptRounds: z.number().int().min(8).max(15).default(12),
    sessionTimeout: z.number().int().positive().default(3600),
    maxLoginAttempts: z.number().int().positive().default(5)
  }),

  // Monitoring and metrics
  monitoring: z.object({
    enabled: z.boolean().default(true),
    metricsInterval: z.number().int().positive().default(60),
    healthCheckInterval: z.number().int().positive().default(30),
    alertThresholds: z.object({
      errorRate: z.number().min(0).max(1).default(0.1),
      responseTime: z.number().int().positive().default(5000),
      memoryUsage: z.number().min(0).max(1).default(0.8)
    })
  })
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type EmailProviderConfig = z.infer<typeof EmailProviderConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;

@injectable()
export class Configuration {
  private logger: Logger;
  private config: AppConfig;
  private configPath: string;

  constructor() {
    this.logger = new Logger('Configuration');
    this.configPath = process.env.CONFIG_PATH || path.join(process.cwd(), 'config');
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing configuration');

    // Load environment variables
    dotenv.config();

    try {
      // Load and validate configuration
      this.config = await this.loadConfiguration();

      this.logger.info('Configuration initialized successfully', {
        environment: this.config.app.environment,
        logLevel: this.config.app.logLevel,
        agentCount: this.config.agents.length,
        pipelineCount: this.config.pipelines.length
      });

    } catch (error) {
      this.logger.error('Failed to initialize configuration', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Configuration not initialized. Call initialize() first.');
    }
    return this.config;
  }

  getEmailConfig(): EmailProviderConfig {
    return this.getConfig().email;
  }

  getAgentConfigs(): AgentConfig[] {
    return this.getConfig().agents;
  }

  getPipelineConfigs(): PipelineConfig[] {
    return this.getConfig().pipelines;
  }

  getEnvironment(): string {
    return this.getConfig().app.environment;
  }

  isDevelopment(): boolean {
    return this.getEnvironment() === 'development';
  }

  isProduction(): boolean {
    return this.getEnvironment() === 'production';
  }

  private async loadConfiguration(): Promise<AppConfig> {
    // Start with default configuration
    let config = this.getDefaultConfiguration();

    // Try to load from file
    try {
      const fileConfig = await this.loadConfigurationFromFile();
      if (fileConfig) {
        config = this.mergeConfigurations(config, fileConfig);
      }
    } catch (error) {
      this.logger.warn('Could not load configuration from file, using defaults', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Override with environment variables
    config = this.applyEnvironmentOverrides(config);

    // Validate the final configuration
    const validationResult = AppConfigSchema.safeParse(config);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err =>
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      throw new Error(`Configuration validation failed: ${errors}`);
    }

    return validationResult.data;
  }

  private async loadConfigurationFromFile(): Promise<Partial<AppConfig> | null> {
    const configFiles = [
      path.join(this.configPath, `config.${process.env.NODE_ENV || 'development'}.json`),
      path.join(this.configPath, 'config.json'),
      path.join(process.cwd(), 'config.json')
    ];

    for (const filePath of configFiles) {
      try {
        const fs = await import('fs/promises');
        const content = await fs.readFile(filePath, 'utf-8');
        const config = JSON.parse(content);

        this.logger.info('Loaded configuration from file', { filePath });
        return config;

      } catch (error) {
        // File doesn't exist or invalid JSON, try next file
        continue;
      }
    }

    return null;
  }

  private getDefaultConfiguration(): AppConfig {
    return {
      app: {
        name: 'Zetify Email Triage',
        version: '1.0.0',
        environment: 'development',
        logLevel: 'info',
        port: 3000
      },
      email: {
        type: 'imap',
        host: 'localhost',
        port: 993,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER || '',
          pass: process.env.EMAIL_PASS || ''
        }
      },
      database: {
        type: 'sqlite',
        database: 'zetify.db',
        ssl: false,
        poolSize: 10
      },
      agents: [],
      pipelines: [],
      security: {
        jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        bcryptRounds: 12,
        sessionTimeout: 3600,
        maxLoginAttempts: 5
      },
      monitoring: {
        enabled: true,
        metricsInterval: 60,
        healthCheckInterval: 30,
        alertThresholds: {
          errorRate: 0.1,
          responseTime: 5000,
          memoryUsage: 0.8
        }
      }
    };
  }

  private mergeConfigurations(base: AppConfig, override: Partial<AppConfig>): AppConfig {
    // Deep merge configurations
    return {
      ...base,
      ...override,
      app: { ...base.app, ...override.app },
      email: { ...base.email, ...override.email },
      database: { ...base.database, ...override.database },
      security: { ...base.security, ...override.security },
      monitoring: { ...base.monitoring, ...override.monitoring },
      agents: override.agents || base.agents,
      pipelines: override.pipelines || base.pipelines
    };
  }

  private applyEnvironmentOverrides(config: AppConfig): AppConfig {
    // Apply environment variable overrides
    const envOverrides: Partial<AppConfig> = {};

    if (process.env.NODE_ENV) {
      envOverrides.app = { ...config.app, environment: process.env.NODE_ENV as any };
    }

    if (process.env.LOG_LEVEL) {
      envOverrides.app = {
        ...config.app,
        ...envOverrides.app,
        logLevel: process.env.LOG_LEVEL as any
      };
    }

    if (process.env.PORT) {
      envOverrides.app = {
        ...config.app,
        ...envOverrides.app,
        port: parseInt(process.env.PORT, 10)
      };
    }

    // Email configuration from environment
    if (process.env.EMAIL_HOST || process.env.EMAIL_USER || process.env.EMAIL_PASS) {
      envOverrides.email = {
        ...config.email,
        host: process.env.EMAIL_HOST || config.email.host,
        port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : config.email.port,
        auth: {
          user: process.env.EMAIL_USER || config.email.auth.user,
          pass: process.env.EMAIL_PASS || config.email.auth.pass
        }
      };
    }

    // Database configuration from environment
    if (process.env.DATABASE_URL) {
      // Parse database URL (simplified)
      const dbUrl = new URL(process.env.DATABASE_URL);
      envOverrides.database = {
        ...config.database,
        type: dbUrl.protocol.slice(0, -1) as any,
        host: dbUrl.hostname,
        port: parseInt(dbUrl.port, 10),
        database: dbUrl.pathname.slice(1),
        username: dbUrl.username,
        password: dbUrl.password
      };
    }

    return this.mergeConfigurations(config, envOverrides);
  }
}