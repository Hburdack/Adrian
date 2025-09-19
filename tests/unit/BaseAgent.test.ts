import { BaseAgent } from '../../src/agents/BaseAgent.js';
import { AgentStatus, AgentConfiguration, AgentTask, AgentExecutionContext } from '../../src/types/agent.js';
import { EmailContext, Email } from '../../src/types/email.js';

// Mock concrete implementation for testing
class TestAgent extends BaseAgent {
  protected async executeTask<TInput, TOutput>(
    task: AgentTask<TInput, TOutput>,
    context: EmailContext,
    executionContext: AgentExecutionContext
  ) {
    return {
      success: true,
      data: { testResult: true } as TOutput,
      confidence: 0.9,
      processingTime: 0,
      metadata: {}
    };
  }

  canHandle(task: AgentTask): boolean {
    return task.type === 'test';
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent;
  let config: AgentConfiguration;

  beforeEach(() => {
    agent = new TestAgent();
    config = {
      id: 'test-agent-1',
      name: 'Test Agent',
      description: 'A test agent',
      capabilities: [
        {
          name: 'test',
          description: 'Test capability',
          confidence: 1.0
        }
      ],
      priority: 1,
      enabled: true,
      maxConcurrentTasks: 1,
      timeout: 5000,
      retryAttempts: 3,
      dependencies: [],
      parameters: {}
    };
  });

  describe('initialization', () => {
    it('should initialize with valid configuration', async () => {
      await agent.initialize(config);

      expect(agent.id).toBe(config.id);
      expect(agent.name).toBe(config.name);
      expect(agent.status).toBe(AgentStatus.IDLE);
      expect(agent.configuration).toEqual(config);
    });

    it('should be disabled if configuration sets enabled to false', async () => {
      const disabledConfig = { ...config, enabled: false };
      await agent.initialize(disabledConfig);

      expect(agent.status).toBe(AgentStatus.DISABLED);
    });
  });

  describe('task execution', () => {
    let mockEmail: Email;
    let mockContext: EmailContext;
    let mockTask: AgentTask;
    let mockExecutionContext: AgentExecutionContext;

    beforeEach(async () => {
      await agent.initialize(config);

      mockEmail = {
        id: 'email-1',
        from: { email: 'test@example.com', name: 'Test User' },
        to: [{ email: 'support@company.com' }],
        subject: 'Test Email',
        body: { text: 'This is a test email' },
        attachments: [],
        receivedAt: new Date(),
        sentAt: new Date(),
        metadata: {
          messageId: 'msg-1',
          priority: 'normal',
          tags: [],
          labels: []
        },
        rawHeaders: {}
      } as Email;

      mockContext = {
        email: mockEmail
      };

      mockTask = {
        id: 'task-1',
        type: 'test',
        input: { testData: true },
        priority: 1,
        createdAt: new Date(),
        maxRetries: 3,
        currentRetries: 0,
        timeout: 5000,
        dependencies: [],
        metadata: {}
      };

      mockExecutionContext = {
        taskId: mockTask.id,
        agentId: agent.id,
        startTime: new Date(),
        timeout: 5000,
        metadata: {}
      };
    });

    it('should execute task successfully', async () => {
      const result = await agent.execute(mockTask, mockContext, mockExecutionContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ testResult: true });
      expect(result.confidence).toBe(0.9);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(agent.status).toBe(AgentStatus.IDLE);
    });

    it('should update metrics after successful execution', async () => {
      const initialMetrics = agent.metrics;

      await agent.execute(mockTask, mockContext, mockExecutionContext);

      const updatedMetrics = agent.metrics;
      expect(updatedMetrics.totalProcessed).toBe(initialMetrics.totalProcessed + 1);
      expect(updatedMetrics.successRate).toBe(1.0);
      expect(updatedMetrics.errorCount).toBe(0);
    });

    it('should handle execution errors gracefully', async () => {
      // Create an agent that throws an error
      class FailingAgent extends BaseAgent {
        protected async executeTask() {
          throw new Error('Test error');
        }

        canHandle(task: AgentTask): boolean {
          return true;
        }
      }

      const failingAgent = new FailingAgent();
      await failingAgent.initialize(config);

      const result = await failingAgent.execute(mockTask, mockContext, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Test error');
      expect(failingAgent.status).toBe(AgentStatus.ERROR);
    });

    it('should validate input before execution', async () => {
      // Mock validateInput to return false
      jest.spyOn(agent, 'validateInput').mockResolvedValue(false);

      const result = await agent.execute(mockTask, mockContext, mockExecutionContext);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Invalid task input');
    });
  });

  describe('health status', () => {
    beforeEach(async () => {
      await agent.initialize(config);
    });

    it('should report healthy status by default', async () => {
      const healthStatus = await agent.getHealthStatus();

      expect(healthStatus.healthy).toBe(true);
      expect(healthStatus.issues).toHaveLength(0);
      expect(healthStatus.lastCheck).toBeInstanceOf(Date);
    });

    it('should report unhealthy when in error state', async () => {
      // Force agent into error state
      (agent as any)._status = AgentStatus.ERROR;

      const healthStatus = await agent.getHealthStatus();

      expect(healthStatus.healthy).toBe(false);
      expect(healthStatus.issues).toContain('Agent is in error state');
    });

    it('should report unhealthy with high error count', async () => {
      // Force high error count
      (agent as any)._metrics.errorCount = 15;

      const healthStatus = await agent.getHealthStatus();

      expect(healthStatus.healthy).toBe(false);
      expect(healthStatus.issues).toContain('High error count detected');
    });
  });

  describe('configuration updates', () => {
    beforeEach(async () => {
      await agent.initialize(config);
    });

    it('should update configuration', async () => {
      const updates = {
        priority: 5,
        maxConcurrentTasks: 3
      };

      await agent.updateConfiguration(updates);

      expect(agent.configuration.priority).toBe(5);
      expect(agent.configuration.maxConcurrentTasks).toBe(3);
    });

    it('should update status when enabled state changes', async () => {
      await agent.updateConfiguration({ enabled: false });
      expect(agent.status).toBe(AgentStatus.DISABLED);

      await agent.updateConfiguration({ enabled: true });
      expect(agent.status).toBe(AgentStatus.IDLE);
    });
  });

  describe('shutdown', () => {
    beforeEach(async () => {
      await agent.initialize(config);
    });

    it('should shutdown gracefully', async () => {
      await agent.shutdown();

      expect(agent.status).toBe(AgentStatus.DISABLED);
    });
  });

  describe('canHandle', () => {
    beforeEach(async () => {
      await agent.initialize(config);
    });

    it('should return true for supported task types', () => {
      const task = { type: 'test' } as AgentTask;
      expect(agent.canHandle(task)).toBe(true);
    });

    it('should return false for unsupported task types', () => {
      const task = { type: 'unsupported' } as AgentTask;
      expect(agent.canHandle(task)).toBe(false);
    });
  });
});