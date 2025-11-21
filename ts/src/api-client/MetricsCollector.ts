/**
 * Metrics Collector
 *
 * Implements latency metrics observability for API calls
 */

import {
    MetricsObserver,
    ApiCallContext,
    ApiCallResult,
    EndpointMetrics,
    LatencyMetrics,
} from './types.js';

/**
 * Default implementation of MetricsObserver with comprehensive latency tracking
 */
export class MetricsCollector implements MetricsObserver {
    private metrics: Map<string, EndpointMetrics>;
    private latencyHistory: Map<string, number[]>;
    private readonly maxHistorySize: number;

    constructor(maxHistorySize: number = 1000) {
        this.metrics = new Map();
        this.latencyHistory = new Map();
        this.maxHistorySize = maxHistorySize;
    }

    /**
     * Called when an API call starts
     */
    onCallStart(context: ApiCallContext): void {
        // Initialize metrics for new endpoint
        const key = this.getEndpointKey(context.endpoint.namespace, context.endpoint.path);
        if (!this.metrics.has(key)) {
            this.initializeEndpointMetrics(key);
        }
    }

    /**
     * Called when an API call completes successfully
     */
    onCallComplete(result: ApiCallResult): void {
        const key = this.getEndpointKey(
            result.context.endpoint.namespace,
            result.context.endpoint.path
        );
        const metrics = this.metrics.get(key);
        if (!metrics) {
            return;
        }

        // Update metrics
        metrics.totalCalls++;
        if (result.success) {
            metrics.successfulCalls++;
        } else {
            metrics.failedCalls++;
        }

        // Update latency statistics
        const duration = result.metrics.duration;
        this.updateLatencyStats(key, duration, metrics);

        // Update rate limit delay
        if (result.metrics.rateLimitDelay) {
            metrics.totalRateLimitDelay += result.metrics.rateLimitDelay;
        }

        metrics.lastCallTime = result.context.timestamp;
    }

    /**
     * Called when an API call fails
     */
    onCallError(context: ApiCallContext, error: Error, metrics: LatencyMetrics): void {
        const key = this.getEndpointKey(context.endpoint.namespace, context.endpoint.path);
        const endpointMetrics = this.metrics.get(key);
        if (!endpointMetrics) {
            return;
        }

        endpointMetrics.totalCalls++;
        endpointMetrics.failedCalls++;

        // Still track latency for failed requests
        this.updateLatencyStats(key, metrics.duration, endpointMetrics);

        if (metrics.rateLimitDelay) {
            endpointMetrics.totalRateLimitDelay += metrics.rateLimitDelay;
        }

        endpointMetrics.lastCallTime = context.timestamp;
    }

    /**
     * Get aggregated metrics for an endpoint
     */
    getEndpointMetrics(endpoint: string): EndpointMetrics | undefined {
        return this.metrics.get(endpoint);
    }

    /**
     * Get all collected metrics
     */
    getAllMetrics(): Map<string, EndpointMetrics> {
        return new Map(this.metrics);
    }

    /**
     * Reset all metrics
     */
    reset(): void {
        this.metrics.clear();
        this.latencyHistory.clear();
    }

    /**
     * Export metrics as JSON
     */
    exportMetrics(): Record<string, EndpointMetrics> {
        const result: Record<string, EndpointMetrics> = {};
        this.metrics.forEach((value, key) => {
            result[key] = { ...value };
        });
        return result;
    }

    /**
     * Get summary statistics
     */
    getSummary(): {
        totalEndpoints: number;
        totalCalls: number;
        totalSuccessfulCalls: number;
        totalFailedCalls: number;
        averageLatency: number;
        totalRateLimitDelay: number;
    } {
        let totalCalls = 0;
        let totalSuccessful = 0;
        let totalFailed = 0;
        let totalLatency = 0;
        let totalRateLimit = 0;

        this.metrics.forEach((metrics) => {
            totalCalls += metrics.totalCalls;
            totalSuccessful += metrics.successfulCalls;
            totalFailed += metrics.failedCalls;
            totalLatency += metrics.averageLatency * metrics.totalCalls;
            totalRateLimit += metrics.totalRateLimitDelay;
        });

        return {
            totalEndpoints: this.metrics.size,
            totalCalls,
            totalSuccessfulCalls: totalSuccessful,
            totalFailedCalls: totalFailed,
            averageLatency: totalCalls > 0 ? totalLatency / totalCalls : 0,
            totalRateLimitDelay: totalRateLimit,
        };
    }

    /**
     * Initialize metrics for a new endpoint
     */
    private initializeEndpointMetrics(key: string): void {
        this.metrics.set(key, {
            endpoint: key,
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            averageLatency: 0,
            minLatency: Infinity,
            maxLatency: 0,
            p50Latency: 0,
            p95Latency: 0,
            p99Latency: 0,
            totalRateLimitDelay: 0,
            lastCallTime: 0,
        });
        this.latencyHistory.set(key, []);
    }

    /**
     * Update latency statistics for an endpoint
     */
    private updateLatencyStats(key: string, duration: number, metrics: EndpointMetrics): void {
        // Update min/max
        metrics.minLatency = Math.min(metrics.minLatency, duration);
        metrics.maxLatency = Math.max(metrics.maxLatency, duration);

        // Update average
        const totalCalls = metrics.totalCalls + 1;
        metrics.averageLatency =
            (metrics.averageLatency * metrics.totalCalls + duration) / totalCalls;

        // Update latency history for percentile calculations
        let history = this.latencyHistory.get(key);
        if (!history) {
            history = [];
            this.latencyHistory.set(key, history);
        }

        history.push(duration);

        // Limit history size (keep most recent)
        if (history.length > this.maxHistorySize) {
            history.shift();
        }

        // Calculate percentiles
        this.updatePercentiles(key, metrics);
    }

    /**
     * Calculate percentile latencies
     */
    private updatePercentiles(key: string, metrics: EndpointMetrics): void {
        const history = this.latencyHistory.get(key);
        if (!history || history.length === 0) {
            return;
        }

        const sorted = [...history].sort((a, b) => a - b);
        metrics.p50Latency = this.getPercentile(sorted, 0.5);
        metrics.p95Latency = this.getPercentile(sorted, 0.95);
        metrics.p99Latency = this.getPercentile(sorted, 0.99);
    }

    /**
     * Get percentile value from sorted array
     */
    private getPercentile(sorted: number[], percentile: number): number {
        const index = Math.ceil(sorted.length * percentile) - 1;
        return sorted[Math.max(0, index)];
    }

    /**
     * Generate endpoint key
     */
    private getEndpointKey(namespace: string, path: string): string {
        return `${namespace}/${path}`;
    }
}

/**
 * Real-time metrics stream for observability dashboards
 */
export class MetricsStream {
    private callbacks: Set<(result: ApiCallResult) => void>;
    private errorCallbacks: Set<(context: ApiCallContext, error: Error) => void>;

    constructor() {
        this.callbacks = new Set();
        this.errorCallbacks = new Set();
    }

    /**
     * Subscribe to API call results
     */
    subscribe(callback: (result: ApiCallResult) => void): () => void {
        this.callbacks.add(callback);
        return () => this.callbacks.delete(callback);
    }

    /**
     * Subscribe to API call errors
     */
    subscribeErrors(callback: (context: ApiCallContext, error: Error) => void): () => void {
        this.errorCallbacks.add(callback);
        return () => this.errorCallbacks.delete(callback);
    }

    /**
     * Emit API call result to all subscribers
     */
    emit(result: ApiCallResult): void {
        this.callbacks.forEach((callback) => {
            try {
                callback(result);
            } catch (error) {
                console.error('Error in metrics stream callback:', error);
            }
        });
    }

    /**
     * Emit API call error to all subscribers
     */
    emitError(context: ApiCallContext, error: Error): void {
        this.errorCallbacks.forEach((callback) => {
            try {
                callback(context, error);
            } catch (err) {
                console.error('Error in metrics stream error callback:', err);
            }
        });
    }

    /**
     * Clear all subscriptions
     */
    clear(): void {
        this.callbacks.clear();
        this.errorCallbacks.clear();
    }
}
