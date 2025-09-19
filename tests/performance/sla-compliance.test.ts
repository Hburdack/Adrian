import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { EmailTriageSystem } from '../../src/system/email-triage-system';
import { EmailGenerator } from '../fixtures/email-generator';
import { PerformanceMonitor } from '../helpers/performance-monitor';
import { SLAValidator } from '../helpers/sla-validator';
import { LoadTestRunner } from '../helpers/load-test-runner';

describe('SLA Compliance Performance Tests', () => {
  let triageSystem: EmailTriageSystem;
  let performanceMonitor: PerformanceMonitor;
  let slaValidator: SLAValidator;
  let loadRunner: LoadTestRunner;

  beforeAll(async () => {
    triageSystem = await createTestSystem({
      performanceMode: true,
      monitoring: true
    });

    performanceMonitor = new PerformanceMonitor();
    slaValidator = new SLAValidator();
    loadRunner = new LoadTestRunner();

    await triageSystem.initialize();
  });

  afterAll(async () => {
    await triageSystem.shutdown();
    await performanceMonitor.exportResults();
  });

  describe('Processing Time SLA Compliance', () => {
    it('should process urgent emails within 1 hour SLA', async () => {
      // Arrange
      const urgentEmails = Array.from({ length: 50 }, () =>
        EmailGenerator.generateUrgent()
      );

      // Act
      const results = await Promise.all(
        urgentEmails.map(async (email) => {
          const startTime = Date.now();
          const result = await triageSystem.processEmail(email);
          const processingTime = Date.now() - startTime;

          return {
            emailId: email.id,
            processingTime,
            urgency: result.urgency,
            slaCompliant: processingTime < 3600000 // 1 hour in ms
          };
        })
      );

      // Assert
      const complianceRate = results.filter(r => r.slaCompliant).length / results.length;
      const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
      const p95ProcessingTime = calculatePercentile(results.map(r => r.processingTime), 95);

      expect(complianceRate).toBeGreaterThan(0.95); // 95% compliance
      expect(avgProcessingTime).toBeLessThan(1800000); // 30 minutes average
      expect(p95ProcessingTime).toBeLessThan(3600000); // 1 hour for 95th percentile
    });

    it('should process routine emails within 4 hour SLA', async () => {
      // Arrange
      const routineEmails = Array.from({ length: 100 }, () =>
        EmailGenerator.generateRoutine()
      );

      // Act
      const results = await Promise.all(
        routineEmails.map(async (email) => {
          const startTime = Date.now();
          const result = await triageSystem.processEmail(email);
          const processingTime = Date.now() - startTime;

          return {
            emailId: email.id,
            processingTime,
            urgency: result.urgency,
            slaCompliant: processingTime < 14400000 // 4 hours in ms
          };
        })
      );

      // Assert
      const complianceRate = results.filter(r => r.slaCompliant).length / results.length;
      const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;

      expect(complianceRate).toBeGreaterThan(0.98); // 98% compliance for routine
      expect(avgProcessingTime).toBeLessThan(7200000); // 2 hours average
    });

    it('should maintain 30-second individual processing time target', async () => {
      // Arrange
      const mixedEmails = Array.from({ length: 200 }, () =>
        EmailGenerator.generateMixed()
      );

      // Act
      const results = await Promise.all(
        mixedEmails.map(async (email) => {
          const startTime = Date.now();
          await triageSystem.processEmail(email);
          return Date.now() - startTime;
        })
      );

      // Assert
      const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;
      const p90Time = calculatePercentile(results, 90);
      const p99Time = calculatePercentile(results, 99);
      const fastProcessing = results.filter(time => time < 30000).length / results.length;

      expect(avgTime).toBeLessThan(15000); // 15 seconds average
      expect(p90Time).toBeLessThan(30000); // 30 seconds for 90th percentile
      expect(p99Time).toBeLessThan(60000); // 1 minute for 99th percentile
      expect(fastProcessing).toBeGreaterThan(0.9); // 90% under 30 seconds
    });
  });

  describe('High-Volume Load Performance', () => {
    it('should maintain performance under sustained load of 100 emails/minute', async () => {
      // Arrange
      const loadTest = loadRunner.createSustainedLoad({
        emailsPerMinute: 100,
        duration: '5m',
        emailTypes: ['support', 'sales', 'urgent', 'routine']
      });

      // Act
      const results = await loadTest.run(triageSystem);

      // Assert
      expect(results.totalProcessed).toBeGreaterThan(450); // Allow for startup time
      expect(results.errorRate).toBeLessThan(0.01); // <1% error rate
      expect(results.avgResponseTime).toBeLessThan(30000); // 30 seconds
      expect(results.p95ResponseTime).toBeLessThan(60000); // 1 minute
      expect(results.throughput).toBeGreaterThan(90); // emails per minute
    });

    it('should handle peak load bursts without degradation', async () => {
      // Arrange
      const burstTest = loadRunner.createBurstLoad({
        burstSize: 50,
        burstInterval: 30000, // 30 seconds
        numberOfBursts: 10,
        baselineLoad: 20 // emails per minute
      });

      // Act
      const results = await burstTest.run(triageSystem);

      // Assert
      expect(results.burstHandling.avgBurstProcessingTime).toBeLessThan(120000); // 2 minutes per burst
      expect(results.burstHandling.queueBackup).toBeLessThan(100); // Queue doesn't grow indefinitely
      expect(results.systemRecovery.avgRecoveryTime).toBeLessThan(60000); // 1 minute recovery
      expect(results.errorRate).toBeLessThan(0.02); // <2% error rate during bursts
    });

    it('should scale agent performance under concurrent processing', async () => {
      // Arrange
      const concurrentEmails = Array.from({ length: 100 }, (_, i) =>
        EmailGenerator.generateRealistic({ sequenceNumber: i })
      );

      // Act
      const startTime = Date.now();
      const promises = concurrentEmails.map(email =>
        triageSystem.processEmail(email)
      );
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      // Assert
      const concurrentProcessingTime = totalTime;
      const sequentialEstimate = results.length * 15000; // 15s per email estimate
      const parallelEfficiency = sequentialEstimate / concurrentProcessingTime;

      expect(parallelEfficiency).toBeGreaterThan(3); // At least 3x faster than sequential
      expect(concurrentProcessingTime).toBeLessThan(60000); // Complete within 1 minute
      expect(results.filter(r => r.status === 'completed').length).toBe(100);
    });
  });

  describe('Resource Utilization and Scaling', () => {
    it('should maintain stable memory usage during continuous operation', async () => {
      // Arrange
      const memoryMonitor = performanceMonitor.createMemoryMonitor();
      memoryMonitor.start();

      // Act - Process emails continuously for 10 minutes
      const duration = 10 * 60 * 1000; // 10 minutes
      const endTime = Date.now() + duration;
      let emailCount = 0;

      while (Date.now() < endTime) {
        const email = EmailGenerator.generateMixed();
        await triageSystem.processEmail(email);
        emailCount++;

        if (emailCount % 50 === 0) {
          await memoryMonitor.takeSnapshot();
        }

        // Small delay to simulate realistic load
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      memoryMonitor.stop();

      // Assert
      const memoryAnalysis = memoryMonitor.analyze();
      expect(memoryAnalysis.memoryGrowthRate).toBeLessThan(0.1); // <10% growth per hour
      expect(memoryAnalysis.peakMemoryUsage).toBeLessThan(1024 * 1024 * 1024); // <1GB peak
      expect(memoryAnalysis.memoryLeaks.detected).toBe(false);
      expect(emailCount).toBeGreaterThan(500); // Processed significant volume
    });

    it('should efficiently scale CPU usage across agent types', async () => {
      // Arrange
      const cpuMonitor = performanceMonitor.createCPUMonitor();
      const agentWorkloads = {
        classifier: Array.from({ length: 100 }, () => EmailGenerator.generateAmbiguous()),
        urgency: Array.from({ length: 100 }, () => EmailGenerator.generateWithDeadline()),
        retriever: Array.from({ length: 100 }, () => EmailGenerator.generateFromKnownCustomer()),
        router: Array.from({ length: 100 }, () => EmailGenerator.generateComplex())
      };

      // Act
      cpuMonitor.start();

      for (const [agentType, emails] of Object.entries(agentWorkloads)) {
        const startTime = Date.now();
        await Promise.all(emails.map(email => triageSystem.processEmail(email)));
        const endTime = Date.now();

        cpuMonitor.recordAgentWorkload(agentType, {
          emails: emails.length,
          duration: endTime - startTime
        });
      }

      cpuMonitor.stop();

      // Assert
      const cpuAnalysis = cpuMonitor.analyze();
      expect(cpuAnalysis.avgCpuUtilization).toBeLessThan(80); // <80% average CPU
      expect(cpuAnalysis.peakCpuUtilization).toBeLessThan(95); // <95% peak CPU
      expect(cpuAnalysis.agentEfficiency.classifier).toBeGreaterThan(0.8);
      expect(cpuAnalysis.agentEfficiency.urgency).toBeGreaterThan(0.8);
      expect(cpuAnalysis.agentEfficiency.retriever).toBeGreaterThan(0.7); // May be slower due to external calls
      expect(cpuAnalysis.agentEfficiency.router).toBeGreaterThan(0.9);
    });
  });

  describe('Degraded Performance Scenarios', () => {
    it('should maintain minimum service levels during external service failures', async () => {
      // Arrange
      const emails = Array.from({ length: 50 }, () => EmailGenerator.generateSupport());

      // Simulate external service failures
      await triageSystem.simulateServiceFailure('openai', {
        failureRate: 0.3, // 30% failure rate
        duration: 60000 // 1 minute
      });

      // Act
      const results = await Promise.all(
        emails.map(email => triageSystem.processEmail(email))
      );

      // Assert
      const successRate = results.filter(r => r.status === 'completed').length / results.length;
      const fallbackUsage = results.filter(r => r.fallbackUsed).length / results.length;
      const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;

      expect(successRate).toBeGreaterThan(0.9); // 90% success rate even with failures
      expect(fallbackUsage).toBeGreaterThan(0.2); // Fallbacks were used
      expect(avgProcessingTime).toBeLessThan(45000); // 45 seconds with degraded performance
    });

    it('should gracefully handle memory pressure scenarios', async () => {
      // Arrange
      const memoryStressor = performanceMonitor.createMemoryStressor();

      // Simulate memory pressure
      await memoryStressor.simulateHighMemoryUsage(0.85); // 85% memory usage

      const emails = Array.from({ length: 100 }, () => EmailGenerator.generateComplex());

      // Act
      const results = await Promise.all(
        emails.map(email => triageSystem.processEmail(email))
      );

      await memoryStressor.release();

      // Assert
      const successRate = results.filter(r => r.status === 'completed').length / results.length;
      const degradedMode = results.filter(r => r.degradedMode).length / results.length;

      expect(successRate).toBeGreaterThan(0.85); // 85% success under memory pressure
      expect(degradedMode).toBeLessThan(0.3); // <30% degraded mode activation
    });
  });

  describe('SLA Contract Validation', () => {
    it('should meet all contractual SLA requirements', async () => {
      // Arrange
      const slaContract = {
        urgent: { maxTime: 3600000, targetCompliance: 0.95 }, // 1 hour, 95%
        normal: { maxTime: 14400000, targetCompliance: 0.98 }, // 4 hours, 98%
        routine: { maxTime: 86400000, targetCompliance: 0.99 }, // 24 hours, 99%
        processing: { maxTime: 30000, targetCompliance: 0.90 } // 30 seconds, 90%
      };

      const testSuite = await slaValidator.createComprehensiveTestSuite(slaContract);

      // Act
      const results = await testSuite.run(triageSystem);

      // Assert
      expect(results.urgent.compliance).toBeGreaterThanOrEqual(slaContract.urgent.targetCompliance);
      expect(results.normal.compliance).toBeGreaterThanOrEqual(slaContract.normal.targetCompliance);
      expect(results.routine.compliance).toBeGreaterThanOrEqual(slaContract.routine.targetCompliance);
      expect(results.processing.compliance).toBeGreaterThanOrEqual(slaContract.processing.targetCompliance);

      // Verify all contractual requirements
      expect(results.overallCompliance).toBeGreaterThan(0.95);
      expect(results.escalationRate).toBeLessThan(0.05);
      expect(results.errorRate).toBeLessThan(0.01);
    });
  });

  // Helper functions
  function calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  async function createTestSystem(options: any) {
    // Implementation would create a test system with performance monitoring
    return new EmailTriageSystem(options);
  }
});