/**
 * Real-time Metrics Streaming Example
 *
 * Demonstrates real-time metrics streaming for dashboards and monitoring
 */

import ccxt from '../../ccxt.js';
import { CcxtApiAdapter, MetricsCollector } from '../index.js';

async function realtimeStreamingExample() {
    console.log('=== Real-time Metrics Streaming Example ===\n');

    // Create metrics collector
    const metricsCollector = new MetricsCollector();

    // Create exchange and API client
    const exchange = new ccxt.binance();
    const apiClient = CcxtApiAdapter.createClient(exchange, {
        metricsCollector,
        enableRateLimit: true,
    });

    console.log('Subscribing to real-time metrics stream...\n');

    // Subscribe to metrics stream
    const unsubscribe = apiClient.subscribeMetrics((result) => {
        console.log('---');
        console.log('Timestamp:', new Date(result.context.timestamp).toISOString());
        console.log('Endpoint:', result.context.endpoint.methodName);
        console.log('Method:', result.context.endpoint.method);
        console.log('Path:', result.context.endpoint.fullPath);
        console.log('Success:', result.success);
        console.log('Status Code:', result.statusCode);
        console.log('Latency:', result.metrics.duration.toFixed(2), 'ms');

        if (result.metrics.rateLimitDelay) {
            console.log('Rate Limit Delay:', result.metrics.rateLimitDelay, 'ms');
        }

        if (!result.success && result.error) {
            console.log('Error:', result.error.message);
        }

        console.log();
    });

    console.log('Making API calls (metrics will be streamed in real-time)...\n');

    // Make several API calls
    const endpoints = [
        'publicGetTime',
        'publicGetExchangeInfo',
        'publicGetTicker24hr',
    ];

    for (const endpoint of endpoints) {
        try {
            console.log(`Calling ${endpoint}...`);
            await apiClient.call(endpoint, endpoint === 'publicGetTicker24hr' ? { symbol: 'BTCUSDT' } : {});
            // Wait a bit between calls
            await new Promise((resolve) => setTimeout(resolve, 1000));
        } catch (error) {
            console.error('Call failed:', error.message);
        }
    }

    // Unsubscribe from stream
    console.log('Unsubscribing from metrics stream...\n');
    unsubscribe();

    // Display aggregated metrics
    console.log('=== Aggregated Metrics ===\n');
    const summary = metricsCollector.getSummary();
    console.log('Total Endpoints Called:', summary.totalEndpoints);
    console.log('Total Calls:', summary.totalCalls);
    console.log('Success Rate:', ((summary.totalSuccessfulCalls / summary.totalCalls) * 100).toFixed(2), '%');
    console.log('Average Latency:', summary.averageLatency.toFixed(2), 'ms');

    if (summary.totalRateLimitDelay > 0) {
        console.log('Total Rate Limit Delay:', summary.totalRateLimitDelay, 'ms');
    }
}

// Run example
if (import.meta.url === `file://${process.argv[1]}`) {
    realtimeStreamingExample().catch(console.error);
}

export { realtimeStreamingExample };
