import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AgentOrchestrator } from '../../src/orchestration/agent-orchestrator';
import { createMockAgent } from '../mocks/agent-mocks';
import { EmailGenerator } from '../fixtures/email-generator';
import { createMemoryStoreMock, createWorkflowMock } from '../mocks/service-mocks';

describe('Agent Orchestration - Integration Tests', () => {
  let orchestrator: AgentOrchestrator;
  let mockAgents: any;
  let mockMemoryStore: any;
  let mockWorkflow: any;

  beforeEach(() => {
    // Arrange - Create agent swarm with proper mocking
    mockAgents = {
      classifier: createMockAgent('classifier'),
      urgency: createMockAgent('urgency'),
      retriever: createMockAgent('retriever'),
      router: createMockAgent('router'),
      critique: createMockAgent('critique'),
      refiner: createMockAgent('refiner'),
      escalator: createMockAgent('escalator')
    };

    mockMemoryStore = createMemoryStoreMock();
    mockWorkflow = createWorkflowMock();

    orchestrator = new AgentOrchestrator({
      agents: mockAgents,
      memoryStore: mockMemoryStore,
      workflow: mockWorkflow
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Email Processing Workflow Integration', () => {
    it('should execute complete email processing workflow with proper agent coordination', async () => {
      // Arrange
      const email = EmailGenerator.generateSupport();
      setupSuccessfulWorkflow(mockAgents, email);

      // Act
      const result = await orchestrator.processEmail(email);

      // Assert - Verify agent execution sequence
      expect(mockAgents.classifier.classify).toHaveBeenCalledWith(email);
      expect(mockAgents.urgency.assess).toHaveBeenCalledWith(
        email,
        expect.objectContaining({ intent: 'support', confidence: 0.92 })
      );
      expect(mockAgents.retriever.retrieveContext).toHaveBeenCalledWith(email);
      expect(mockAgents.router.route).toHaveBeenCalledWith(
        email,
        expect.objectContaining({
          classification: expect.any(Object),
          urgency: expect.any(Object),
          context: expect.any(Object)
        })
      );

      // Verify workflow completion
      expect(result.status).toBe('completed');
      expect(result.routedTo).toBe('support@company.com');
      expect(result.processingTime).toBeLessThan(30000);
    });

    it('should coordinate agent memory sharing throughout workflow', async () => {
      // Arrange
      const email = EmailGenerator.generateEnterprise();
      setupSuccessfulWorkflow(mockAgents, email);

      // Act
      await orchestrator.processEmail(email);

      // Assert - Verify memory coordination
      expect(mockMemoryStore.store).toHaveBeenCalledWith(
        `email:${email.id}:classification`,
        expect.any(Object)
      );
      expect(mockMemoryStore.store).toHaveBeenCalledWith(
        `email:${email.id}:urgency`,
        expect.any(Object)
      );
      expect(mockMemoryStore.store).toHaveBeenCalledWith(
        `email:${email.id}:context`,
        expect.any(Object)
      );

      // Verify agents accessed shared memory
      expect(mockMemoryStore.retrieve).toHaveBeenCalledWith(
        `email:${email.id}:classification`
      );
    });

    it('should handle parallel agent processing for independent tasks', async () => {
      // Arrange
      const email = EmailGenerator.generateComplex();
      setupParallelWorkflow(mockAgents, email);

      const startTime = Date.now();

      // Act
      const result = await orchestrator.processEmail(email);

      // Assert - Verify parallel execution efficiency
      const processingTime = Date.now() - startTime;
      expect(processingTime).toBeLessThan(15000); // Should be faster than sequential

      // Verify parallel tasks completed
      expect(mockAgents.retriever.retrieveContext).toHaveBeenCalled();
      expect(mockAgents.urgency.assess).toHaveBeenCalled();
      // Both should have been called in parallel after classification
    });
  });

  describe('Quality Assurance Workflow Integration', () => {
    it('should coordinate critique and refinement workflow for low confidence results', async () => {
      // Arrange
      const email = EmailGenerator.generateAmbiguous();
      setupLowConfidenceWorkflow(mockAgents, email);

      // Act
      const result = await orchestrator.processEmail(email);

      // Assert - Verify QA workflow coordination
      expect(mockAgents.critique.validate).toHaveBeenCalledWith(
        expect.objectContaining({
          classification: expect.any(Object),
          urgency: expect.any(Object),
          routing: expect.any(Object)
        })
      );

      expect(mockAgents.refiner.improve).toHaveBeenCalledWith(
        expect.objectContaining({
          originalResult: expect.any(Object),
          critiqueAnalysis: expect.any(Object)
        })
      );

      expect(result.refined).toBe(true);
      expect(result.iterations).toBe(2);
    });

    it('should escalate to human review when refinement fails to improve confidence', async () => {
      // Arrange
      const email = EmailGenerator.generateHighlyAmbiguous();
      setupEscalationWorkflow(mockAgents, email);

      // Act
      const result = await orchestrator.processEmail(email);

      // Assert - Verify escalation workflow
      expect(mockAgents.refiner.improve).toHaveBeenCalledTimes(2); // Max retry attempts
      expect(mockAgents.escalator.createReviewPacket).toHaveBeenCalledWith(
        email,
        expect.objectContaining({
          attempts: 2,
          finalConfidence: expect.any(Number),
          escalationReason: 'Failed to achieve minimum confidence after refinement'
        })
      );

      expect(result.status).toBe('escalated');
      expect(result.humanReview).toBe(true);
    });

    it('should coordinate assurance score calculation across all agents', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();
      setupAssuranceWorkflow(mockAgents, email);

      // Act
      const result = await orchestrator.processEmail(email);

      // Assert - Verify assurance coordination
      expect(mockWorkflow.calculateAssuranceScore).toHaveBeenCalledWith({
        classificationConfidence: 0.89,
        urgencyConfidence: 0.91,
        contextRelevance: 0.88,
        routingConfidence: 0.93
      });

      expect(result.assuranceScore).toBeGreaterThan(0.65);
      expect(result.action).toBe('accept');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should coordinate agent failure recovery workflow', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();
      mockAgents.classifier.classify.mockRejectedValue(new Error('OpenAI timeout'));
      mockAgents.classifier.classifyWithFallback.mockResolvedValue({
        intent: 'support',
        confidence: 0.7,
        fallbackUsed: true
      });

      // Act
      const result = await orchestrator.processEmail(email);

      // Assert - Verify recovery coordination
      expect(mockAgents.classifier.classifyWithFallback).toHaveBeenCalled();
      expect(mockWorkflow.logFailure).toHaveBeenCalledWith(
        'classifier',
        expect.objectContaining({ error: 'OpenAI timeout' })
      );

      expect(result.status).toBe('completed');
      expect(result.fallbackUsed).toBe(true);
    });

    it('should coordinate graceful degradation when multiple agents fail', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();
      mockAgents.classifier.classify.mockRejectedValue(new Error('Service unavailable'));
      mockAgents.urgency.assess.mockRejectedValue(new Error('SLA service down'));
      mockAgents.retriever.retrieveContext.mockResolvedValue({ limited: true });

      // Act
      const result = await orchestrator.processEmail(email);

      // Assert - Verify degraded mode coordination
      expect(mockWorkflow.enableDegradedMode).toHaveBeenCalled();
      expect(result.status).toBe('degraded');
      expect(result.confidence).toBeLessThan(0.5);
      expect(result.humanReviewRequired).toBe(true);
    });

    it('should coordinate timeout handling across agent workflow', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();
      mockAgents.retriever.retrieveContext.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 35000)) // Exceeds 30s SLA
      );

      // Act
      const result = await orchestrator.processEmail(email, { timeout: 30000 });

      // Assert - Verify timeout coordination
      expect(mockWorkflow.handleTimeout).toHaveBeenCalledWith(
        'retriever',
        expect.any(Number)
      );
      expect(result.status).toBe('timeout');
      expect(result.partialResults).toBeDefined();
    });
  });

  describe('Performance and Monitoring', () => {
    it('should coordinate performance monitoring across all agents', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();
      setupSuccessfulWorkflow(mockAgents, email);

      // Act
      await orchestrator.processEmail(email);

      // Assert - Verify performance tracking
      expect(mockWorkflow.startTimer).toHaveBeenCalledWith('email_processing');
      expect(mockWorkflow.recordAgentMetrics).toHaveBeenCalledWith(
        'classifier',
        expect.objectContaining({ executionTime: expect.any(Number) })
      );
      expect(mockWorkflow.endTimer).toHaveBeenCalledWith('email_processing');
    });

    it('should coordinate resource usage monitoring during processing', async () => {
      // Arrange
      const emails = Array.from({ length: 10 }, () => EmailGenerator.generateBasic());

      // Act
      const results = await Promise.all(
        emails.map(email => orchestrator.processEmail(email))
      );

      // Assert - Verify resource coordination
      expect(mockWorkflow.monitorMemoryUsage).toHaveBeenCalled();
      expect(mockWorkflow.checkResourceLimits).toHaveBeenCalled();

      results.forEach(result => {
        expect(result.resourceUsage).toBeDefined();
      });
    });
  });

  describe('Workflow State Management', () => {
    it('should coordinate workflow state persistence and recovery', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();
      const workflowId = `workflow:${email.id}`;

      // Simulate workflow interruption
      mockAgents.router.route.mockRejectedValue(new Error('Process interrupted'));

      // Act
      await expect(orchestrator.processEmail(email)).rejects.toThrow();

      // Assert - Verify state persistence
      expect(mockWorkflow.saveState).toHaveBeenCalledWith(
        workflowId,
        expect.objectContaining({
          step: 'routing',
          completedSteps: ['classification', 'urgency', 'retrieval'],
          intermediateResults: expect.any(Object)
        })
      );

      // Test recovery
      const resumedResult = await orchestrator.resumeWorkflow(workflowId);
      expect(mockWorkflow.loadState).toHaveBeenCalledWith(workflowId);
      expect(resumedResult.resumed).toBe(true);
    });
  });

  describe('Contract Verification', () => {
    it('should verify agent contracts throughout workflow execution', async () => {
      // Arrange
      const email = EmailGenerator.generateBasic();
      setupSuccessfulWorkflow(mockAgents, email);

      // Act
      const result = await orchestrator.processEmail(email);

      // Assert - Verify contract compliance
      expect(result).toMatchContract({
        status: 'string',
        routedTo: 'string',
        contextNote: 'string',
        processingTime: 'number',
        assuranceScore: 'number',
        auditTrail: 'array'
      });

      // Verify intermediate contracts
      expect(mockWorkflow.verifyContract).toHaveBeenCalledWith(
        'classification',
        expect.any(Object)
      );
      expect(mockWorkflow.verifyContract).toHaveBeenCalledWith(
        'urgency',
        expect.any(Object)
      );
    });
  });

  // Helper functions for test setup
  function setupSuccessfulWorkflow(agents: any, email: any) {
    agents.classifier.classify.mockResolvedValue({
      intent: 'support',
      confidence: 0.92,
      department: 'support'
    });

    agents.urgency.assess.mockResolvedValue({
      urgency: 'normal',
      sla: { hours: 4 }
    });

    agents.retriever.retrieveContext.mockResolvedValue({
      customer: { tier: 'premium' },
      tickets: []
    });

    agents.router.route.mockResolvedValue({
      routedTo: 'support@company.com',
      contextNote: 'Premium customer support request'
    });

    agents.critique.validate.mockResolvedValue({
      score: 0.89,
      action: 'accept'
    });
  }

  function setupLowConfidenceWorkflow(agents: any, email: any) {
    agents.classifier.classify.mockResolvedValue({
      intent: 'other',
      confidence: 0.55,
      department: 'general'
    });

    agents.critique.validate.mockResolvedValue({
      score: 0.55,
      action: 'refine'
    });

    agents.refiner.improve.mockResolvedValue({
      intent: 'support',
      confidence: 0.78,
      refined: true
    });
  }

  function setupEscalationWorkflow(agents: any, email: any) {
    agents.classifier.classify.mockResolvedValue({
      intent: 'other',
      confidence: 0.45
    });

    agents.refiner.improve.mockResolvedValue({
      intent: 'other',
      confidence: 0.48,
      refined: true
    });

    agents.escalator.createReviewPacket.mockResolvedValue({
      reviewId: 'review-123',
      priority: 'high'
    });
  }

  function setupParallelWorkflow(agents: any, email: any) {
    agents.classifier.classify.mockResolvedValue({
      intent: 'sales',
      confidence: 0.89
    });

    // Simulate parallel execution timing
    agents.urgency.assess.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { urgency: 'normal', sla: { hours: 4 } };
    });

    agents.retriever.retrieveContext.mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
      return { customer: { tier: 'standard' } };
    });
  }

  function setupAssuranceWorkflow(agents: any, email: any) {
    setupSuccessfulWorkflow(agents, email);

    mockWorkflow.calculateAssuranceScore.mockReturnValue(0.89);
  }
});