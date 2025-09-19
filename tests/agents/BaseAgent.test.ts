import { BaseAgent } from '@/agents/base/BaseAgent';
import { AgentType, AgentConfig } from '@/types';

// Test implementation of BaseAgent
class TestAgent extends BaseAgent<string, { result: string }> {
  protected async process(input: string): Promise<{
    confidence: number;
    data: { result: string };
    reasoning: string;
    metadata?: Record<string, any>;
  }> {
    if (input === 'fail') {
      throw new Error('Intentional test failure');
    }

    if (input === 'slow') {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return {
      confidence: 0.85,
      data: { result: `Processed: ${input}` },
      reasoning: `Successfully processed input "${input}"`,
      metadata: { inputLength: input.length }
    };
  }

  protected async validateInput(input: string): Promise<void> {
    if (input === 'invalid') {
      throw new Error('Invalid input detected');
    }
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent;
  let config: AgentConfig;

  beforeEach(() => {
    config = {
      agent_type: AgentType.CLASSIFIER,
      model_provider: 'openai',
      model_name: 'gpt-4',
      temperature: 0.7,
      max_tokens: 1000,
      timeout_ms: 5000,
      retry_attempts: 3
    };

    agent = new TestAgent(AgentType.CLASSIFIER, config);
  });

  describe('constructor', () => {
    it('should initialize agent with proper ID and type', () => {
      expect(agent.getId()).toBeDefined();
      expect(agent.getId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(agent.getType()).toBe(AgentType.CLASSIFIER);
    });
  });

  describe('execute', () => {
    it('should successfully execute with valid input', async () => {
      const result = await agent.execute('test input');

      expect(result.status).toBe('success');
      expect(result.agent_id).toBe(agent.getId());
      expect(result.agent_type).toBe(AgentType.CLASSIFIER);
      expect(result.confidence).toBe(0.85);
      expect(result.data.result).toBe('Processed: test input');
      expect(result.reasoning).toBe('Successfully processed input "test input"');
      expect(result.processing_time_ms).toBeGreaterThan(0);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.metadata).toMatchObject({
        model_used: 'gpt-4',
        retry_count: 0,
        inputLength: 10
      });
    });

    it('should handle execution failure gracefully', async () => {
      const result = await agent.execute('fail');

      expect(result.status).toBe('failure');
      expect(result.confidence).toBe(0);
      expect(result.data).toBeNull();
      expect(result.reasoning).toContain('Execution failed: Intentional test failure');
      expect(result.metadata?.error).toBe('Intentional test failure');
    });

    it('should handle input validation failure', async () => {
      const result = await agent.execute('invalid');

      expect(result.status).toBe('failure');
      expect(result.reasoning).toContain('Invalid input detected');
    });

    it('should handle timeout', async () => {
      // Create agent with short timeout
      const shortTimeoutConfig = { ...config, timeout_ms: 1000 };
      const timeoutAgent = new TestAgent(AgentType.CLASSIFIER, shortTimeoutConfig);

      const result = await timeoutAgent.execute('slow');

      expect(result.status).toBe('failure');
      expect(result.reasoning).toContain('timeout');
    }, 10000);

    it('should emit events during execution', async () => {
      const startSpy = jest.fn();
      const successSpy = jest.fn();

      agent.on('execution:start', startSpy);
      agent.on('execution:success', successSpy);

      await agent.execute('test');

      expect(startSpy).toHaveBeenCalledWith({
        executionId: expect.any(String),
        agentId: agent.getId(),
        input: 'test'
      });

      expect(successSpy).toHaveBeenCalledWith({
        executionId: expect.any(String),
        result: expect.objectContaining({
          status: 'success',
          agent_id: agent.getId()
        })
      });
    });
  });

  describe('confidence extraction', () => {
    it('should extract confidence from text with percentage', () => {
      const agent = new TestAgent(AgentType.CLASSIFIER, config);
      const confidence = (agent as any).extractConfidence('I am 85% confident in this result');
      expect(confidence).toBe(0.85);
    });

    it('should extract confidence from text with decimal', () => {
      const agent = new TestAgent(AgentType.CLASSIFIER, config);
      const confidence = (agent as any).extractConfidence('Confidence: 0.92');
      expect(confidence).toBe(0.92);
    });

    it('should calculate default confidence for uncertain text', () => {
      const agent = new TestAgent(AgentType.CLASSIFIER, config);
      const confidence = (agent as any).extractConfidence('I might be uncertain about this');
      expect(confidence).toBeLessThan(0.5);
    });

    it('should calculate default confidence for detailed text', () => {
      const agent = new TestAgent(AgentType.CLASSIFIER, config);
      const longText = 'This is a very detailed response that provides extensive reasoning because it contains substantial evidence and therefore indicates high confidence in the analysis provided with comprehensive justification.';
      const confidence = (agent as any).extractConfidence(longText);
      expect(confidence).toBeGreaterThan(0.7);
    });
  });

  describe('structured response parsing', () => {
    it('should parse JSON response correctly', () => {
      const agent = new TestAgent(AgentType.CLASSIFIER, config);
      const response = 'Here is the result: {"intent": "support", "confidence": 0.9}';
      const schema = { intent: 'string', confidence: 'number' };

      const parsed = (agent as any).parseStructuredResponse(response, schema);

      expect(parsed).toEqual({
        intent: 'support',
        confidence: 0.9
      });
    });

    it('should fallback to text parsing when JSON fails', () => {
      const agent = new TestAgent(AgentType.CLASSIFIER, config);
      const response = 'intent: support\\nconfidence: 0.9';
      const schema = { intent: 'string', confidence: 'number' };

      const parsed = (agent as any).parseStructuredResponse(response, schema);

      expect(parsed.intent).toBe('support');
      expect(parsed.confidence).toBe(0.9);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status for working agent', async () => {
      const health = await agent.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.details).toMatchObject({
        agentId: agent.getId(),
        agentType: AgentType.CLASSIFIER,
        responseTime: expect.any(Number),
        modelProvider: 'openai',
        modelName: 'gpt-4',
        lastCheck: expect.any(String)
      });
    });
  });
});