/**
 * Basic Usage Example
 *
 * Demonstrates basic usage of the Universal API Client
 */

import ccxt from '../../ccxt.js';
import { CcxtApiAdapter } from '../index.js';

async function basicUsageExample() {
    console.log('=== Basic Usage Example ===\n');

    // Create exchange instance
    const exchange = new ccxt.binance({
        apiKey: process.env.BINANCE_API_KEY,
        secret: process.env.BINANCE_SECRET,
        enableRateLimit: true,
    });

    // Extract and create API client
    console.log('Creating API client...');
    const apiClient = CcxtApiAdapter.createClient(exchange);

    // Get list of available endpoints
    const endpoints = apiClient.getEndpoints();
    console.log(`Total endpoints available: ${endpoints.length}\n`);

    // Example 1: Call a public endpoint
    console.log('Example 1: Calling public endpoint (system status)');
    try {
        const result = await apiClient.call('sapiGetSystemStatus');
        console.log('Response:', JSON.stringify(result.data, null, 2));
        console.log('Latency:', result.metrics.duration, 'ms');
        console.log('Success:', result.success);
        console.log();
    } catch (error) {
        console.error('Error:', error.message);
    }

    // Example 2: Using dynamic method
    console.log('Example 2: Using dynamic method');
    try {
        // The client auto-generates methods for each endpoint
        const result = await (apiClient as any).publicGetTime();
        console.log('Server time:', result.data);
        console.log('Latency:', result.metrics.duration, 'ms');
        console.log();
    } catch (error) {
        console.error('Error:', error.message);
    }

    // Example 3: Get metrics for an endpoint
    console.log('Example 3: Getting metrics');
    const metrics = apiClient.getEndpointMetrics('sapi/system/status');
    if (metrics) {
        console.log('Endpoint:', metrics.endpoint);
        console.log('Total calls:', metrics.totalCalls);
        console.log('Average latency:', metrics.averageLatency.toFixed(2), 'ms');
        console.log();
    }

    // Example 4: Get all metrics
    console.log('Example 4: All endpoint metrics');
    const allMetrics = apiClient.getAllMetrics();
    console.log(`Tracked ${allMetrics.size} endpoints\n`);

    for (const [endpoint, m] of allMetrics) {
        console.log(`${endpoint}:`);
        console.log(`  Calls: ${m.totalCalls}`);
        console.log(`  Avg: ${m.averageLatency.toFixed(2)}ms`);
        console.log(`  Min: ${m.minLatency.toFixed(2)}ms`);
        console.log(`  Max: ${m.maxLatency.toFixed(2)}ms`);
    }
}

// Run example
if (import.meta.url === `file://${process.argv[1]}`) {
    basicUsageExample().catch(console.error);
}

export { basicUsageExample };
