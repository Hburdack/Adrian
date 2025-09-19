export class AcceptanceCriteriaValidator {
  private results: any[] = [];

  calculateRoutingAccuracy(results: any[], testDataset: any[]): number {
    if (results.length !== testDataset.length) {
      throw new Error('Results and test dataset length mismatch');
    }

    let correctRoutes = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const expected = testDataset[i];

      const expectedRoute = this.getExpectedRoute(
        expected.metadata?.expectedIntent || 'general'
      );

      if (result.routedTo === expectedRoute) {
        correctRoutes++;
      }
    }

    return correctRoutes / results.length;
  }

  validateSLACompliance(results: any[], urgencyType: string): {
    averageTime: number;
    complianceRate: number;
    p95Time: number;
    violations: any[];
  } {
    const slaLimits = {
      'urgent': 3600000, // 1 hour in ms
      'normal': 14400000, // 4 hours in ms
      'routine': 86400000, // 24 hours in ms
    };

    const limit = slaLimits[urgencyType] || slaLimits['normal'];
    const processingTimes = results.map(r => r.processingTime || 0);
    const violations = [];

    // Calculate metrics
    const averageTime = processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length;
    const compliantResults = results.filter(r => (r.processingTime || 0) <= limit);
    const complianceRate = compliantResults.length / results.length;
    const sortedTimes = processingTimes.sort((a, b) => a - b);
    const p95Index = Math.ceil(0.95 * sortedTimes.length) - 1;
    const p95Time = sortedTimes[p95Index];

    // Identify violations
    results.forEach((result, index) => {
      if ((result.processingTime || 0) > limit) {
        violations.push({
          emailId: result.emailId,
          processingTime: result.processingTime,
          limit,
          overageMs: result.processingTime - limit,
          urgency: result.urgency?.level || urgencyType
        });
      }
    });

    return {
      averageTime,
      complianceRate,
      p95Time,
      violations
    };
  }

  calculateMisroutingRate(results: any[], labeledEmails: any[]): number {
    if (results.length !== labeledEmails.length) {
      throw new Error('Results and labeled emails length mismatch');
    }

    let misroutes = 0;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const expected = labeledEmails[i];

      if (result.routedTo !== expected.expectedRoute) {
        misroutes++;
      }
    }

    return misroutes / results.length;
  }

  validateAcceptanceCriteria(results: any[]): {
    routingAccuracy: number;
    slaCompliance: any;
    escalationRate: number;
    misroutingRate: number;
    overallCompliance: boolean;
    details: any;
  } {
    // Calculate routing accuracy
    const correctRoutes = results.filter(r => r.routingCorrect === true).length;
    const routingAccuracy = correctRoutes / results.length;

    // Calculate SLA compliance by urgency
    const urgentResults = results.filter(r => r.urgency?.level === 'urgent');
    const normalResults = results.filter(r => r.urgency?.level === 'normal');
    const routineResults = results.filter(r => r.urgency?.level === 'routine');

    const slaCompliance = {
      urgent: urgentResults.length > 0 ? this.validateSLACompliance(urgentResults, 'urgent') : null,
      normal: normalResults.length > 0 ? this.validateSLACompliance(normalResults, 'normal') : null,
      routine: routineResults.length > 0 ? this.validateSLACompliance(routineResults, 'routine') : null
    };

    // Calculate escalation rate
    const escalatedResults = results.filter(r => r.humanReviewRequired === true);
    const escalationRate = escalatedResults.length / results.length;

    // Calculate misrouting rate
    const misroutedResults = results.filter(r => r.misrouted === true);
    const misroutingRate = misroutedResults.length / results.length;

    // Check overall compliance
    const overallCompliance =
      routingAccuracy >= 0.90 && // ≥90% routing accuracy
      escalationRate <= 0.05 && // ≤5% escalation rate
      misroutingRate <= 0.02 && // ≤2% misrouting rate
      (slaCompliance.urgent?.complianceRate || 1) >= 0.95 && // ≥95% urgent SLA compliance
      (slaCompliance.normal?.complianceRate || 1) >= 0.95; // ≥95% normal SLA compliance

    return {
      routingAccuracy,
      slaCompliance,
      escalationRate,
      misroutingRate,
      overallCompliance,
      details: {
        totalEmails: results.length,
        correctRoutes,
        escalated: escalatedResults.length,
        misrouted: misroutedResults.length,
        urgentEmails: urgentResults.length,
        normalEmails: normalResults.length,
        routineEmails: routineResults.length
      }
    };
  }

  generateComplianceReport(results: any[]): {
    summary: any;
    criteria: any;
    recommendations: string[];
    passFailStatus: boolean;
  } {
    const validation = this.validateAcceptanceCriteria(results);
    const recommendations: string[] = [];

    // Generate recommendations based on failures
    if (validation.routingAccuracy < 0.90) {
      recommendations.push(
        `Routing accuracy is ${(validation.routingAccuracy * 100).toFixed(1)}%, below 90% target. ` +
        'Consider improving classifier training or adding more context data.'
      );
    }

    if (validation.escalationRate > 0.05) {
      recommendations.push(
        `Escalation rate is ${(validation.escalationRate * 100).toFixed(1)}%, above 5% target. ` +
        'Review confidence thresholds and improve agent reliability.'
      );
    }

    if (validation.misroutingRate > 0.02) {
      recommendations.push(
        `Misrouting rate is ${(validation.misroutingRate * 100).toFixed(1)}%, above 2% target. ` +
        'Review routing rules and classification accuracy.'
      );
    }

    // SLA compliance recommendations
    if (validation.slaCompliance.urgent && validation.slaCompliance.urgent.complianceRate < 0.95) {
      recommendations.push(
        `Urgent email SLA compliance is ${(validation.slaCompliance.urgent.complianceRate * 100).toFixed(1)}%, ` +
        'below 95% target. Consider optimizing urgent email processing pipeline.'
      );
    }

    return {
      summary: {
        totalEmails: validation.details.totalEmails,
        overallCompliance: validation.overallCompliance,
        keyMetrics: {
          routingAccuracy: `${(validation.routingAccuracy * 100).toFixed(1)}%`,
          escalationRate: `${(validation.escalationRate * 100).toFixed(1)}%`,
          misroutingRate: `${(validation.misroutingRate * 100).toFixed(1)}%`
        }
      },
      criteria: {
        routingAccuracy: {
          target: '≥90%',
          actual: `${(validation.routingAccuracy * 100).toFixed(1)}%`,
          passed: validation.routingAccuracy >= 0.90
        },
        escalationRate: {
          target: '≤5%',
          actual: `${(validation.escalationRate * 100).toFixed(1)}%`,
          passed: validation.escalationRate <= 0.05
        },
        misroutingRate: {
          target: '≤2%',
          actual: `${(validation.misroutingRate * 100).toFixed(1)}%`,
          passed: validation.misroutingRate <= 0.02
        },
        urgentSLA: {
          target: '≤1 hour, ≥95% compliance',
          actual: validation.slaCompliance.urgent ?
            `${(validation.slaCompliance.urgent.complianceRate * 100).toFixed(1)}% compliance` : 'N/A',
          passed: !validation.slaCompliance.urgent || validation.slaCompliance.urgent.complianceRate >= 0.95
        },
        normalSLA: {
          target: '≤4 hours, ≥95% compliance',
          actual: validation.slaCompliance.normal ?
            `${(validation.slaCompliance.normal.complianceRate * 100).toFixed(1)}% compliance` : 'N/A',
          passed: !validation.slaCompliance.normal || validation.slaCompliance.normal.complianceRate >= 0.95
        }
      },
      recommendations,
      passFailStatus: validation.overallCompliance
    };
  }

  private getExpectedRoute(intent: string): string {
    const routeMap = {
      'support': 'support@company.com',
      'sales': 'sales@company.com',
      'hr': 'hr@company.com',
      'legal': 'legal@company.com',
      'finance': 'finance@company.com',
      'spam': 'security@company.com',
      'general': 'general@company.com'
    };
    return routeMap[intent] || 'general@company.com';
  }

  // Method to track and store results for batch analysis
  addResult(result: any): void {
    this.results.push({
      ...result,
      timestamp: new Date().toISOString()
    });
  }

  clearResults(): void {
    this.results = [];
  }

  getStoredResults(): any[] {
    return [...this.results];
  }

  // Continuous monitoring method
  monitorContinuousCompliance(windowSize: number = 100): {
    isCompliant: boolean;
    trend: string;
    alerts: string[];
  } {
    if (this.results.length < windowSize) {
      return {
        isCompliant: true,
        trend: 'insufficient_data',
        alerts: [`Need at least ${windowSize} results for continuous monitoring`]
      };
    }

    const recentResults = this.results.slice(-windowSize);
    const validation = this.validateAcceptanceCriteria(recentResults);

    // Calculate trend by comparing current window with previous window
    let trend = 'stable';
    if (this.results.length >= windowSize * 2) {
      const previousResults = this.results.slice(-windowSize * 2, -windowSize);
      const previousValidation = this.validateAcceptanceCriteria(previousResults);

      const accuracyDiff = validation.routingAccuracy - previousValidation.routingAccuracy;
      const escalationDiff = validation.escalationRate - previousValidation.escalationRate;

      if (accuracyDiff > 0.02 && escalationDiff < -0.01) {
        trend = 'improving';
      } else if (accuracyDiff < -0.02 || escalationDiff > 0.01) {
        trend = 'degrading';
      }
    }

    const alerts: string[] = [];
    if (!validation.overallCompliance) {
      alerts.push('Overall compliance failure detected');
    }
    if (validation.routingAccuracy < 0.85) {
      alerts.push('Critical routing accuracy drop below 85%');
    }
    if (validation.escalationRate > 0.10) {
      alerts.push('Critical escalation rate above 10%');
    }

    return {
      isCompliant: validation.overallCompliance,
      trend,
      alerts
    };
  }
}