/**
 * Metrics Observability Example
 *
 * Demonstrates comprehensive latency metrics tracking and observability
 */

import ccxt from '../../ccxt.js';
import { CcxtApiAdapter, MetricsCollector } from '../index.js';

async function metricsObservabilityExample() {
    console.log('=== Metrics Observability Example ===\n');

    // Create custom metrics collector
    const metricsCollector = new MetricsCollector(1000);

    // Create exchange and API client
    const exchange = new ccxt.binance();
    const apiClient = CcxtApiAdapter.createClient(exchange, {
        metricsCollector,
        enableRateLimit: true,
    });

    console.log('Making multiple API calls to collect metrics...\n');

    // Make several calls to the same endpoint
    for (let i = 0; i < 10; i++) {
        try {
            await apiClient.call('publicGetTime');
            await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
            console.error('Error:', error.message);
        }
    }

    // Get detailed metrics
    console.log('=== Detailed Metrics ===\n');

    const metrics = apiClient.getEndpointMetrics('public/time');
    if (metrics) {
        console.log('Endpoint:', metrics.endpoint);
        console.log('Total Calls:', metrics.totalCalls);
        console.log('Successful:', metrics.successfulCalls);
        console.log('Failed:', metrics.failedCalls);
        console.log('Success Rate:', ((metrics.successfulCalls / metrics.totalCalls) * 100).toFixed(2), '%');
        console.log();
        console.log('Latency Statistics:');
        console.log('  Average:', metrics.averageLatency.toFixed(2), 'ms');
        console.log('  Minimum:', metrics.minLatency.toFixed(2), 'ms');
        console.log('  Maximum:', metrics.maxLatency.toFixed(2), 'ms');
        console.log('  Median (P50):', metrics.p50Latency.toFixed(2), 'ms');
        console.log('  P95:', metrics.p95Latency.toFixed(2), 'ms');
        console.log('  P99:', metrics.p99Latency.toFixed(2), 'ms');
        console.log();
        console.log('Rate Limiting:');
        console.log('  Total delay:', metrics.totalRateLimitDelay, 'ms');
        console.log();
    }

    // Get summary across all endpoints
    console.log('=== Summary Statistics ===\n');
    const summary = metricsCollector.getSummary();
    console.log('Total Endpoints:', summary.totalEndpoints);
    console.log('Total API Calls:', summary.totalCalls);
    console.log('Successful Calls:', summary.totalSuccessfulCalls);
    console.log('Failed Calls:', summary.totalFailedCalls);
    console.log('Overall Avg Latency:', summary.averageLatency.toFixed(2), 'ms');
    console.log('Total Rate Limit Delay:', summary.totalRateLimitDelay, 'ms');
    console.log();

    // Export metrics as JSON
    console.log('=== Exported Metrics (JSON) ===\n');
    const metricsJson = metricsCollector.exportMetrics();
    console.log(JSON.stringify(metricsJson, null, 2));
}

// Run example
if (import.meta.url === `file://${process.argv[1]}`) {
    metricsObservabilityExample().catch(console.error);
}

export { metricsObservabilityExample };
