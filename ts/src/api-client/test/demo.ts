/**
 * Simple Demo Script
 *
 * Demonstrates the Universal API Client with manual endpoint definitions
 * This runs independently without requiring CCXT or external dependencies
 */

import {
    UniversalApiClient,
    ApiClientBuilder,
    ApiEndpoint,
    MetricsCollector,
    ApiExtractor,
} from '../index.js';

async function demo() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║     Universal API Client - Standalone Demo                    ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // ========================================================================
    // Demo 1: Standalone API Client (No CCXT Required)
    // ========================================================================
    console.log('📋 Demo 1: Standalone API Client');
    console.log('─────────────────────────────────────\n');

    // Define endpoints manually
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
            path: 'v3/exchangeInfo',
            cost: 10,
            methodName: 'apiGetV3ExchangeInfo',
            fullPath: 'api/v3/exchangeInfo',
            requiresAuth: false,
        },
    ];

    console.log('✅ Defined 3 endpoints manually');
    console.log(`   - ${endpoints[0].methodName}() [Cost: ${endpoints[0].cost}]`);
    console.log(`   - ${endpoints[1].methodName}() [Cost: ${endpoints[1].cost}]`);
    console.log(`   - ${endpoints[2].methodName}() [Cost: ${endpoints[2].cost}]`);
    console.log();

    // ========================================================================
    // Demo 2: Build API Client with Metrics
    // ========================================================================
    console.log('📋 Demo 2: Build API Client with Metrics');
    console.log('─────────────────────────────────────\n');

    const metricsCollector = new MetricsCollector();

    const apiClient = new ApiClientBuilder()
        .withEndpoints(endpoints)
        .withBaseUrl('https://api.binance.com')
        .withRateLimit(1000)
        .withTimeout(30000)
        .withMetricsObserver(metricsCollector)
        .withHeaders({
            'User-Agent': 'UniversalApiClient-Demo/1.0',
        })
        .build();

    console.log('✅ API Client created successfully');
    console.log(`   Base URL: https://api.binance.com`);
    console.log(`   Rate Limit: 1000ms`);
    console.log(`   Timeout: 30000ms`);
    console.log(`   Metrics: Enabled`);
    console.log();

    // ========================================================================
    // Demo 3: Make Real API Calls
    // ========================================================================
    console.log('📋 Demo 3: Make Real API Calls');
    console.log('─────────────────────────────────────\n');

    // Call 1: Get server time
    console.log('Calling apiGetV3Time()...');
    try {
        const timeResult = await apiClient.call('apiGetV3Time');

        if (timeResult.success) {
            console.log('✅ Success!');
            console.log(`   Server Time: ${new Date(timeResult.data.serverTime).toISOString()}`);
            console.log(`   Latency: ${timeResult.metrics.duration.toFixed(2)}ms`);
            console.log(`   Status Code: ${timeResult.statusCode}`);
            if (timeResult.metrics.rateLimitDelay) {
                console.log(`   Rate Limit Delay: ${timeResult.metrics.rateLimitDelay}ms`);
            }
        } else {
            console.log('❌ Failed');
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
    console.log();

    // Call 2: Get BTC/USDT ticker
    console.log('Calling apiGetV3Ticker24hr({ symbol: "BTCUSDT" })...');
    try {
        const tickerResult = await apiClient.call('apiGetV3Ticker24hr', {
            symbol: 'BTCUSDT'
        });

        if (tickerResult.success) {
            console.log('✅ Success!');
            console.log(`   Symbol: ${tickerResult.data.symbol}`);
            console.log(`   Last Price: $${parseFloat(tickerResult.data.lastPrice).toLocaleString()}`);
            console.log(`   24h Change: ${tickerResult.data.priceChangePercent}%`);
            console.log(`   24h Volume: ${parseFloat(tickerResult.data.volume).toLocaleString()} BTC`);
            console.log(`   Latency: ${tickerResult.metrics.duration.toFixed(2)}ms`);
        } else {
            console.log('❌ Failed');
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
    console.log();

    // Call 3: Get exchange info
    console.log('Calling apiGetV3ExchangeInfo()...');
    try {
        const infoResult = await apiClient.call('apiGetV3ExchangeInfo');

        if (infoResult.success) {
            console.log('✅ Success!');
            console.log(`   Timezone: ${infoResult.data.timezone}`);
            console.log(`   Symbols Available: ${infoResult.data.symbols.length}`);
            console.log(`   Rate Limits: ${infoResult.data.rateLimits.length} configured`);
            console.log(`   Latency: ${infoResult.metrics.duration.toFixed(2)}ms`);
        } else {
            console.log('❌ Failed');
        }
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
    }
    console.log();

    // ========================================================================
    // Demo 4: Latency Metrics Analysis
    // ========================================================================
    console.log('📋 Demo 4: Latency Metrics Analysis');
    console.log('─────────────────────────────────────\n');

    console.log('Making 10 more calls to collect metrics...');
    for (let i = 0; i < 10; i++) {
        try {
            await apiClient.call('apiGetV3Time');
            process.stdout.write('.');
        } catch (error) {
            process.stdout.write('x');
        }
    }
    console.log(' Done!\n');

    // Get metrics for the time endpoint
    const timeMetrics = metricsCollector.getEndpointMetrics('api/v3/time');
    if (timeMetrics) {
        console.log('Metrics for api/v3/time:');
        console.log(`  Total Calls: ${timeMetrics.totalCalls}`);
        console.log(`  Successful: ${timeMetrics.successfulCalls} (${((timeMetrics.successfulCalls / timeMetrics.totalCalls) * 100).toFixed(1)}%)`);
        console.log(`  Failed: ${timeMetrics.failedCalls}`);
        console.log();
        console.log('  Latency Statistics:');
        console.log(`    Min:     ${timeMetrics.minLatency.toFixed(2)}ms`);
        console.log(`    P50:     ${timeMetrics.p50Latency.toFixed(2)}ms (median)`);
        console.log(`    Average: ${timeMetrics.averageLatency.toFixed(2)}ms`);
        console.log(`    P95:     ${timeMetrics.p95Latency.toFixed(2)}ms`);
        console.log(`    P99:     ${timeMetrics.p99Latency.toFixed(2)}ms`);
        console.log(`    Max:     ${timeMetrics.maxLatency.toFixed(2)}ms`);
        console.log();
    }

    // Get overall summary
    const summary = metricsCollector.getSummary();
    console.log('Overall Summary:');
    console.log(`  Total Endpoints: ${summary.totalEndpoints}`);
    console.log(`  Total API Calls: ${summary.totalCalls}`);
    console.log(`  Success Rate: ${((summary.totalSuccessfulCalls / summary.totalCalls) * 100).toFixed(2)}%`);
    console.log(`  Overall Avg Latency: ${summary.averageLatency.toFixed(2)}ms`);
    if (summary.totalRateLimitDelay > 0) {
        console.log(`  Total Rate Limit Delay: ${summary.totalRateLimitDelay}ms`);
    }
    console.log();

    // ========================================================================
    // Demo 5: Detailed Metrics for All Endpoints
    // ========================================================================
    console.log('📋 Demo 5: All Endpoint Metrics');
    console.log('─────────────────────────────────────\n');

    const allMetrics = metricsCollector.getAllMetrics();
    console.log(`Tracked ${allMetrics.size} endpoints:\n`);

    for (const [endpoint, metrics] of allMetrics) {
        console.log(`${endpoint}:`);
        console.log(`  Calls: ${metrics.totalCalls}, Avg: ${metrics.averageLatency.toFixed(2)}ms, P95: ${metrics.p95Latency.toFixed(2)}ms`);
    }
    console.log();

    // ========================================================================
    // Demo 6: Export Metrics
    // ========================================================================
    console.log('📋 Demo 6: Export Metrics as JSON');
    console.log('─────────────────────────────────────\n');

    const metricsJson = metricsCollector.exportMetrics();
    console.log('Exported metrics (sample):');
    console.log(JSON.stringify(metricsJson, null, 2).substring(0, 500) + '...\n');

    // ========================================================================
    // Demo Complete
    // ========================================================================
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    Demo Complete! ✨                           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('Key Features Demonstrated:');
    console.log('✅ Standalone API client (no CCXT required)');
    console.log('✅ Manual endpoint definition');
    console.log('✅ Real API calls with latency tracking');
    console.log('✅ Comprehensive metrics collection');
    console.log('✅ Percentile calculations (P50, P95, P99)');
    console.log('✅ Success/failure tracking');
    console.log('✅ Rate limiting support');
    console.log('✅ JSON export of metrics');
    console.log();
}

// Run demo
if (import.meta.url === `file://${process.argv[1]}`) {
    demo()
        .then(() => {
            console.log('Demo completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Demo failed:', error);
            process.exit(1);
        });
}

export { demo };
