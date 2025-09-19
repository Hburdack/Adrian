import { Configuration, AppConfigSchema } from '../../src/config/Configuration.js';

// Mock fs/promises for testing
jest.mock('fs/promises', () => ({
  readFile: jest.fn()
}));

describe('Configuration', () => {
  let configuration: Configuration;

  beforeEach(() => {
    configuration = new Configuration();
    // Clear environment variables
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
    delete process.env.EMAIL_HOST;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete process.env.JWT_SECRET;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', async () => {
      await configuration.initialize();

      const config = configuration.getConfig();
      expect(config.app.name).toBe('Zetify Email Triage');
      expect(config.app.environment).toBe('development');
      expect(config.app.logLevel).toBe('info');
    });

    it('should apply environment variable overrides', async () => {
      process.env.NODE_ENV = 'production';
      process.env.LOG_LEVEL = 'error';
      process.env.EMAIL_HOST = 'mail.example.com';

      await configuration.initialize();

      const config = configuration.getConfig();
      expect(config.app.environment).toBe('production');
      expect(config.app.logLevel).toBe('error');
      expect(config.email.host).toBe('mail.example.com');
    });

    it('should validate configuration schema', async () => {
      // Set invalid log level
      process.env.LOG_LEVEL = 'invalid';

      await expect(configuration.initialize()).rejects.toThrow(/Configuration validation failed/);
    });
  });

  describe('configuration access methods', () => {
    beforeEach(async () => {
      await configuration.initialize();
    });

    it('should return email configuration', () => {
      const emailConfig = configuration.getEmailConfig();
      expect(emailConfig).toHaveProperty('type');
      expect(emailConfig).toHaveProperty('host');
      expect(emailConfig).toHaveProperty('auth');
    });

    it('should return agent configurations', () => {
      const agentConfigs = configuration.getAgentConfigs();
      expect(Array.isArray(agentConfigs)).toBe(true);
    });

    it('should return pipeline configurations', () => {
      const pipelineConfigs = configuration.getPipelineConfigs();
      expect(Array.isArray(pipelineConfigs)).toBe(true);
    });

    it('should identify development environment', () => {
      expect(configuration.isDevelopment()).toBe(true);
      expect(configuration.isProduction()).toBe(false);
    });
  });

  describe('configuration file loading', () => {
    it('should load configuration from file when available', async () => {
      const mockFileContent = JSON.stringify({
        app: {
          name: 'Custom Zetify',
          logLevel: 'debug'
        },
        agents: [
          {
            id: 'test-agent',
            name: 'Test Agent',
            description: 'Test',
            capabilities: [],
            priority: 1,
            enabled: true,
            maxConcurrentTasks: 1,
            timeout: 5000,
            retryAttempts: 3,
            dependencies: [],
            parameters: {}
          }
        ]
      });

      const fs = await import('fs/promises');
      (fs.readFile as jest.Mock).mockResolvedValue(mockFileContent);

      await configuration.initialize();

      const config = configuration.getConfig();
      expect(config.app.name).toBe('Custom Zetify');
      expect(config.app.logLevel).toBe('debug');
      expect(config.agents).toHaveLength(1);
    });

    it('should handle missing configuration file gracefully', async () => {
      const fs = await import('fs/promises');
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(configuration.initialize()).resolves.not.toThrow();

      const config = configuration.getConfig();
      expect(config.app.name).toBe('Zetify Email Triage'); // Default value
    });

    it('should handle invalid JSON in configuration file', async () => {
      const fs = await import('fs/promises');
      (fs.readFile as jest.Mock).mockResolvedValue('invalid json {');

      await expect(configuration.initialize()).resolves.not.toThrow();

      const config = configuration.getConfig();
      expect(config.app.name).toBe('Zetify Email Triage'); // Default value
    });
  });

  describe('schema validation', () => {
    it('should validate valid configuration', () => {
      const validConfig = {
        app: {
          name: 'Test App',
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
            user: 'test@example.com',
            pass: 'password'
          }
        },
        database: {
          type: 'sqlite',
          database: 'test.db'
        },
        agents: [],
        pipelines: [],
        security: {
          jwtSecret: 'test-secret-key-32-characters-long',
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

      const result = AppConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email configuration', () => {
      const invalidConfig = {
        app: {
          name: 'Test App',
          version: '1.0.0',
          environment: 'development',
          logLevel: 'info',
          port: 3000
        },
        email: {
          type: 'invalid-type', // Invalid email type
          host: '',
          port: -1,
          secure: true,
          auth: {
            user: 'invalid-email',
            pass: ''
          }
        },
        database: {
          type: 'sqlite',
          database: 'test.db'
        },
        agents: [],
        pipelines: [],
        security: {
          jwtSecret: 'short', // Too short
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

      const result = AppConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should throw error when accessing config before initialization', () => {
      expect(() => configuration.getConfig()).toThrow('Configuration not initialized');
    });

    it('should throw error when accessing email config before initialization', () => {
      expect(() => configuration.getEmailConfig()).toThrow('Configuration not initialized');
    });
  });
});