/**
 * Standalone Usage Example
 *
 * Demonstrates using the API client independently of CCXT
 */

import {
    UniversalApiClient,
    ApiClientBuilder,
    ApiEndpoint,
    MetricsCollector,
} from '../index.js';

async function standaloneUsageExample() {
    console.log('=== Standalone Usage Example ===\n');

    // Define endpoints manually (without CCXT)
    const endpoints: ApiEndpoint[] = [
        {
            namespace: 'api',
            method: 'GET',
            path: 'v3/time',
            cost: 1,
            methodName: 'apiGetV3Time',
            fullPath: 'api/v3/time',
            requiresAuth: false,
        },
        {
            namespace: 'api',
            method: 'GET',
            path: 'v3/ticker/24hr',
            cost: 1,
            methodName: 'apiGetV3Ticker24hr',
            fullPath: 'api/v3/ticker/24hr',
            requiresAuth: false,
        },
        {
            namespace: 'api',
            method: 'GET',
            path: 'v3/account',
            cost: 10,
            methodName: 'apiGetV3Account',
            fullPath: 'api/v3/account',
            requiresAuth: true,
        },
    ];

    // Create metrics collector
    const metricsCollector = new MetricsCollector();

    // Build API client
    console.log('Building standalone API client...');
    const apiClient = new ApiClientBuilder()
        .withEndpoints(endpoints)
        .withBaseUrl('https://api.binance.com')
        .withRateLimit(1000) // 1 request per second
        .withTimeout(30000) // 30 second timeout
        .withMetricsObserver(metricsCollector)
        .withHeaders({
            'User-Agent': 'Custom-Client/1.0',
        })
        .build();

    console.log('Client created with', endpoints.length, 'endpoints\n');

    // Make API calls
    console.log('Making API call to get server time...');
    try {
        const timeResult = await apiClient.call('apiGetV3Time');
        console.log('Server time:', timeResult.data);
        console.log('Latency:', timeResult.metrics.duration, 'ms');
        console.log('Status:', timeResult.statusCode);
        console.log();
    } catch (error) {
        console.error('Error:', error.message);
    }

    console.log('Making API call to get 24hr ticker...');
    try {
        const tickerResult = await apiClient.call('apiGetV3Ticker24hr', {
            symbol: 'BTCUSDT',
        });
        console.log('Ticker data:', JSON.stringify(tickerResult.data, null, 2).substring(0, 200) + '...');
        console.log('Latency:', tickerResult.metrics.duration, 'ms');
        console.log();
    } catch (error) {
        console.error('Error:', error.message);
    }

    // Make raw request
    console.log('Making raw HTTP request...');
    try {
        const rawResult = await apiClient.request('GET', 'api/v3/exchangeInfo', {
            symbol: 'BTCUSDT',
        });
        console.log('Exchange info received');
        console.log('Latency:', rawResult.metrics.duration, 'ms');
        console.log();
    } catch (error) {
        console.error('Error:', error.message);
    }

    // Display metrics
    console.log('=== Collected Metrics ===\n');
    const summary = metricsCollector.getSummary();
    console.log('Total Calls:', summary.totalCalls);
    console.log('Successful:', summary.totalSuccessfulCalls);
    console.log('Failed:', summary.totalFailedCalls);
    console.log('Average Latency:', summary.averageLatency.toFixed(2), 'ms');
    console.log();

    // Show per-endpoint metrics
    const allMetrics = metricsCollector.getAllMetrics();
    for (const [endpoint, metrics] of allMetrics) {
        console.log(`${endpoint}:`);
        console.log(`  Calls: ${metrics.totalCalls}`);
        console.log(`  Avg Latency: ${metrics.averageLatency.toFixed(2)}ms`);
        console.log(`  P95 Latency: ${metrics.p95Latency.toFixed(2)}ms`);
    }
}

// Run example
if (import.meta.url === `file://${process.argv[1]}`) {
    standaloneUsageExample().catch(console.error);
}

export { standaloneUsageExample };
