import { EventEmitter } from 'events';
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
    histograms: Record<string, {
        count: number;
        sum: number;
        buckets: Record<string, number>;
    }>;
    lastUpdated: Date;
}
export declare class MetricsCollector extends EventEmitter {
    private logger;
    private counters;
    private gauges;
    private histograms;
    private metricLabels;
    private lastCollectionTime;
    constructor();
    incrementCounter(name: string, value?: number, labels?: Record<string, string>): void;
    getCounter(name: string, labels?: Record<string, string>): number;
    setGauge(name: string, value: number, labels?: Record<string, string>): void;
    incrementGauge(name: string, value?: number, labels?: Record<string, string>): void;
    decrementGauge(name: string, value?: number, labels?: Record<string, string>): void;
    getGauge(name: string, labels?: Record<string, string>): number;
    recordHistogram(name: string, value: number, buckets?: number[], labels?: Record<string, string>): void;
    getHistogram(name: string, labels?: Record<string, string>): {
        count: number;
        sum: number;
        average: number;
        buckets: Record<string, number>;
    } | null;
    startTimer(name: string, labels?: Record<string, string>): () => void;
    recordEmailReceived(source: string): void;
    recordEmailProcessed(pipelineId: string, success: boolean, processingTime: number): void;
    recordAgentExecution(agentId: string, taskType: string, success: boolean, executionTime: number): void;
    recordPipelineExecution(pipelineId: string, status: string, duration: number): void;
    recordSystemMetrics(): void;
    getSummary(): MetricsSummary;
    exportPrometheusMetrics(): string;
    clear(): void;
    private setupSystemMetrics;
    private getMetricKey;
    private getBaseName;
    private getLabelsString;
    private addLabelToString;
}
//# sourceMappingURL=MetricsCollector.d.ts.map