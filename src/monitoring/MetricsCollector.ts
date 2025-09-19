import { injectable } from 'inversify';
import { EventEmitter } from 'events';
import { Logger } from './Logger.js';

export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}

export interface Counter extends Metric {
  type: 'counter';
}

export interface Gauge extends Metric {
  type: 'gauge';
}

export interface Histogram extends Metric {
  type: 'histogram';
  buckets?: number[];
}

export interface MetricsSummary {
  totalMetrics: number;
  counters: Record<string, number>;
  gauges: Record<string, number>;
  histograms: Record<string, { count: number; sum: number; buckets: Record<string, number> }>;
  lastUpdated: Date;
}

@injectable()
export class MetricsCollector extends EventEmitter {
  private logger: Logger;
  private counters = new Map<string, number>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, { count: number; sum: number; buckets: Map<number, number> }>();
  private metricLabels = new Map<string, Record<string, string>>();

  constructor() {
    super();
    this.logger = new Logger('MetricsCollector');
    this.setupSystemMetrics();
  }

  // Counter methods
  incrementCounter(name: string, value = 1, labels?: Record<string, string>): void {
    const metricKey = this.getMetricKey(name, labels);
    const currentValue = this.counters.get(metricKey) || 0;
    this.counters.set(metricKey, currentValue + value);

    if (labels) {
      this.metricLabels.set(metricKey, labels);
    }

    this.emit('counter', { name, value: currentValue + value, labels });
    this.logger.debug('Counter incremented', { name, value, labels });
  }

  getCounter(name: string, labels?: Record<string, string>): number {
    const metricKey = this.getMetricKey(name, labels);
    return this.counters.get(metricKey) || 0;
  }

  // Gauge methods
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const metricKey = this.getMetricKey(name, labels);
    this.gauges.set(metricKey, value);

    if (labels) {
      this.metricLabels.set(metricKey, labels);
    }

    this.emit('gauge', { name, value, labels });
    this.logger.debug('Gauge set', { name, value, labels });
  }

  incrementGauge(name: string, value = 1, labels?: Record<string, string>): void {
    const metricKey = this.getMetricKey(name, labels);
    const currentValue = this.gauges.get(metricKey) || 0;
    this.setGauge(name, currentValue + value, labels);
  }

  decrementGauge(name: string, value = 1, labels?: Record<string, string>): void {
    this.incrementGauge(name, -value, labels);
  }

  getGauge(name: string, labels?: Record<string, string>): number {
    const metricKey = this.getMetricKey(name, labels);
    return this.gauges.get(metricKey) || 0;
  }

  // Histogram methods
  recordHistogram(name: string, value: number, buckets = [0.1, 0.5, 1, 2.5, 5, 10], labels?: Record<string, string>): void {
    const metricKey = this.getMetricKey(name, labels);
    let histogram = this.histograms.get(metricKey);

    if (!histogram) {
      histogram = {
        count: 0,
        sum: 0,
        buckets: new Map(buckets.map(bucket => [bucket, 0]))
      };
      this.histograms.set(metricKey, histogram);
    }

    histogram.count++;
    histogram.sum += value;

    // Update buckets
    for (const bucket of buckets) {
      if (value <= bucket) {
        const currentCount = histogram.buckets.get(bucket) || 0;
        histogram.buckets.set(bucket, currentCount + 1);
      }
    }

    if (labels) {
      this.metricLabels.set(metricKey, labels);
    }

    this.emit('histogram', { name, value, labels });
    this.logger.debug('Histogram recorded', { name, value, labels });
  }

  getHistogram(name: string, labels?: Record<string, string>): { count: number; sum: number; average: number; buckets: Record<string, number> } | null {
    const metricKey = this.getMetricKey(name, labels);
    const histogram = this.histograms.get(metricKey);

    if (!histogram) {
      return null;
    }

    const buckets: Record<string, number> = {};
    for (const [bucket, count] of histogram.buckets) {
      buckets[bucket.toString()] = count;
    }

    return {
      count: histogram.count,
      sum: histogram.sum,
      average: histogram.count > 0 ? histogram.sum / histogram.count : 0,
      buckets
    };
  }

  // Timing utilities
  startTimer(name: string, labels?: Record<string, string>): () => void {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      this.recordHistogram(`${name}_duration_ms`, duration, [10, 50, 100, 500, 1000, 5000], labels);
    };
  }

  // Email processing specific metrics
  recordEmailReceived(source: string): void {
    this.incrementCounter('emails_received_total', 1, { source });
  }

  recordEmailProcessed(pipelineId: string, success: boolean, processingTime: number): void {
    this.incrementCounter('emails_processed_total', 1, { pipeline: pipelineId, success: success.toString() });
    this.recordHistogram('email_processing_duration_ms', processingTime, [100, 500, 1000, 5000, 10000], { pipeline: pipelineId });
  }

  recordAgentExecution(agentId: string, taskType: string, success: boolean, executionTime: number): void {
    this.incrementCounter('agent_executions_total', 1, { agent: agentId, task_type: taskType, success: success.toString() });
    this.recordHistogram('agent_execution_duration_ms', executionTime, [10, 50, 100, 500, 1000], { agent: agentId, task_type: taskType });
  }

  recordPipelineExecution(pipelineId: string, status: string, duration: number): void {
    this.incrementCounter('pipeline_executions_total', 1, { pipeline: pipelineId, status });
    this.recordHistogram('pipeline_duration_ms', duration, [500, 1000, 5000, 10000, 30000], { pipeline: pipelineId });
  }

  // System resource metrics
  recordSystemMetrics(): void {
    const memUsage = process.memoryUsage();

    this.setGauge('process_memory_rss_bytes', memUsage.rss);
    this.setGauge('process_memory_heap_used_bytes', memUsage.heapUsed);
    this.setGauge('process_memory_heap_total_bytes', memUsage.heapTotal);
    this.setGauge('process_memory_external_bytes', memUsage.external);

    // CPU usage (simplified)
    const cpuUsage = process.cpuUsage();
    this.setGauge('process_cpu_user_microseconds', cpuUsage.user);
    this.setGauge('process_cpu_system_microseconds', cpuUsage.system);

    // Uptime
    this.setGauge('process_uptime_seconds', process.uptime());
  }

  // Get all metrics summary
  getSummary(): MetricsSummary {
    const summary: MetricsSummary = {
      totalMetrics: this.counters.size + this.gauges.size + this.histograms.size,
      counters: {},
      gauges: {},
      histograms: {},
      lastUpdated: new Date()
    };

    // Aggregate counters
    for (const [key, value] of this.counters) {
      const baseName = this.getBaseName(key);
      summary.counters[baseName] = (summary.counters[baseName] || 0) + value;
    }

    // Aggregate gauges
    for (const [key, value] of this.gauges) {
      const baseName = this.getBaseName(key);
      summary.gauges[baseName] = value; // For gauges, we take the latest value
    }

    // Aggregate histograms
    for (const [key, histogram] of this.histograms) {
      const baseName = this.getBaseName(key);
      if (!summary.histograms[baseName]) {
        summary.histograms[baseName] = { count: 0, sum: 0, buckets: {} };
      }

      summary.histograms[baseName].count += histogram.count;
      summary.histograms[baseName].sum += histogram.sum;

      for (const [bucket, count] of histogram.buckets) {
        const bucketKey = bucket.toString();
        summary.histograms[baseName].buckets[bucketKey] =
          (summary.histograms[baseName].buckets[bucketKey] || 0) + count;
      }
    }

    return summary;
  }

  // Export metrics in Prometheus format
  exportPrometheusMetrics(): string {
    const lines: string[] = [];

    // Export counters
    for (const [key, value] of this.counters) {
      const labels = this.getLabelsString(key);
      lines.push(`# TYPE ${this.getBaseName(key)} counter`);
      lines.push(`${this.getBaseName(key)}${labels} ${value}`);
    }

    // Export gauges
    for (const [key, value] of this.gauges) {
      const labels = this.getLabelsString(key);
      lines.push(`# TYPE ${this.getBaseName(key)} gauge`);
      lines.push(`${this.getBaseName(key)}${labels} ${value}`);
    }

    // Export histograms
    for (const [key, histogram] of this.histograms) {
      const baseName = this.getBaseName(key);
      const labels = this.getLabelsString(key);

      lines.push(`# TYPE ${baseName} histogram`);

      for (const [bucket, count] of histogram.buckets) {
        const bucketLabels = this.addLabelToString(labels, 'le', bucket.toString());
        lines.push(`${baseName}_bucket${bucketLabels} ${count}`);
      }

      lines.push(`${baseName}_bucket${this.addLabelToString(labels, 'le', '+Inf')} ${histogram.count}`);
      lines.push(`${baseName}_count${labels} ${histogram.count}`);
      lines.push(`${baseName}_sum${labels} ${histogram.sum}`);
    }

    return lines.join('\n');
  }

  // Clear all metrics
  clear(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.metricLabels.clear();
    this.logger.info('All metrics cleared');
  }

  private setupSystemMetrics(): void {
    // Record system metrics every 30 seconds
    setInterval(() => {
      this.recordSystemMetrics();
    }, 30000);

    // Initial recording
    this.recordSystemMetrics();
  }

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }

    const sortedLabels = Object.keys(labels)
      .sort()
      .map(key => `${key}="${labels[key]}"`)
      .join(',');

    return `${name}{${sortedLabels}}`;
  }

  private getBaseName(metricKey: string): string {
    const braceIndex = metricKey.indexOf('{');
    return braceIndex === -1 ? metricKey : metricKey.substring(0, braceIndex);
  }

  private getLabelsString(metricKey: string): string {
    const braceIndex = metricKey.indexOf('{');
    return braceIndex === -1 ? '' : metricKey.substring(braceIndex);
  }

  private addLabelToString(labelsString: string, key: string, value: string): string {
    if (!labelsString) {
      return `{${key}="${value}"}`;
    }

    // Remove closing brace and add new label
    const withoutClosingBrace = labelsString.slice(0, -1);
    return `${withoutClosingBrace},${key}="${value}"}`;
  }
}