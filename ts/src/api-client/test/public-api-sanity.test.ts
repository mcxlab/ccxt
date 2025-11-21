/**
 * Public API Sanity Test
 *
 * End-to-end test using real public API endpoints to verify:
 * - API extraction works correctly
 * - Client can make real API calls
 * - Latency metrics are collected accurately
 * - All components work together
 */

import Exchange from '../../binance.js';
import {
    CcxtApiAdapter,
    ApiExtractor,
    MetricsCollector,
    ApiClientBuilder,
} from '../index.js';

async function publicApiSanityTest() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║        Public API Sanity Test - End-to-End Verification       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    let passedTests = 0;
    let failedTests = 0;

    // Helper function to log test results
    function testResult(testName: string, passed: boolean, message?: string) {
        if (passed) {
            console.log(`✅ ${testName}`);
            if (message) console.log(`   ${message}`);
            passedTests++;
        } else {
            console.log(`❌ ${testName}`);
            if (message) console.log(`   ${message}`);
            failedTests++;
        }
    }

    try {
        // ========================================================================
        // Test 1: Create Exchange Instance
        // ========================================================================
        console.log('📋 Test 1: Create Exchange Instance');
        console.log('─────────────────────────────────────\n');

        const exchange = new Exchange();
        testResult(
            'Exchange instance created',
            exchange !== null && exchange.id === 'binance',
            `Exchange ID: ${exchange.id}`
        );
        console.log();

        // ========================================================================
        // Test 2: Extract API Definition
        // ========================================================================
        console.log('📋 Test 2: Extract API Definition');
        console.log('─────────────────────────────────────\n');

        const apiDef = ApiExtractor.extractApi(exchange);

        testResult('API definition extracted', apiDef !== null);
        testResult('Exchange ID matches', apiDef.exchangeId === 'binance');
        testResult('Has endpoints', apiDef.endpoints.length > 0, `Found ${apiDef.endpoints.length} endpoints`);
        testResult('Has rate limit', apiDef.rateLimit > 0, `Rate limit: ${apiDef.rateLimit}ms`);

        // Find public endpoints
        const publicEndpoints = ApiExtractor.filterByAuth(apiDef.endpoints, false);
        testResult('Has public endpoints', publicEndpoints.length > 0, `Found ${publicEndpoints.length} public endpoints`);
        console.log();

        // ========================================================================
        // Test 3: Create API Client with Metrics
        // ========================================================================
        console.log('📋 Test 3: Create API Client with Metrics');
        console.log('─────────────────────────────────────\n');

        const metricsCollector = new MetricsCollector();
        const apiClient = CcxtApiAdapter.createClient(exchange, {
            metricsCollector,
            enableRateLimit: true,
        });

        testResult('API client created', apiClient !== null);
        testResult('Client has endpoints', apiClient.getEndpoints().length > 0);
        testResult('Metrics collector attached', apiClient.getMetricsObserver() === metricsCollector);
        console.log();

        // ========================================================================
        // Test 4: Make Real Public API Calls
        // ========================================================================
        console.log('📋 Test 4: Make Real Public API Calls');
        console.log('─────────────────────────────────────\n');

        // Test 4a: Get server time
        console.log('Test 4a: Get Server Time (publicGetTime)');
        try {
            const timeResult = await apiClient.call('publicGetTime');

            testResult('Server time call successful', timeResult.success === true);
            testResult('Response has data', timeResult.data !== null && timeResult.data !== undefined);
            testResult('HTTP status is 200', timeResult.statusCode === 200);
            testResult('Latency measured', timeResult.metrics.duration > 0, `Latency: ${timeResult.metrics.duration.toFixed(2)}ms`);

            if (timeResult.data && timeResult.data.serverTime) {
                console.log(`   Server time: ${new Date(timeResult.data.serverTime).toISOString()}`);
            }
        } catch (error) {
            testResult('Server time call successful', false, `Error: ${error.message}`);
        }
        console.log();

        // Test 4b: Get exchange info
        console.log('Test 4b: Get Exchange Info (publicGetExchangeInfo)');
        try {
            const exchangeInfoResult = await apiClient.call('publicGetExchangeInfo');

            testResult('Exchange info call successful', exchangeInfoResult.success === true);
            testResult('Response has data', exchangeInfoResult.data !== null);
            testResult('Latency measured', exchangeInfoResult.metrics.duration > 0, `Latency: ${exchangeInfoResult.metrics.duration.toFixed(2)}ms`);

            if (exchangeInfoResult.data && exchangeInfoResult.data.symbols) {
                const symbolCount = exchangeInfoResult.data.symbols.length;
                console.log(`   Symbols available: ${symbolCount}`);
                testResult('Has trading symbols', symbolCount > 0);
            }
        } catch (error) {
            testResult('Exchange info call successful', false, `Error: ${error.message}`);
        }
        console.log();

        // Test 4c: Get ticker for BTC/USDT
        console.log('Test 4c: Get 24hr Ticker (publicGetTicker24hr)');
        try {
            const tickerResult = await apiClient.call('publicGetTicker24hr', {
                symbol: 'BTCUSDT'
            });

            testResult('Ticker call successful', tickerResult.success === true);
            testResult('Response has data', tickerResult.data !== null);
            testResult('Latency measured', tickerResult.metrics.duration > 0, `Latency: ${tickerResult.metrics.duration.toFixed(2)}ms`);

            if (tickerResult.data) {
                if (tickerResult.data.lastPrice) {
                    console.log(`   BTC/USDT Price: $${parseFloat(tickerResult.data.lastPrice).toLocaleString()}`);
                    testResult('Has price data', parseFloat(tickerResult.data.lastPrice) > 0);
                } else if (Array.isArray(tickerResult.data) && tickerResult.data.length > 0) {
                    const btcTicker = tickerResult.data.find(t => t.symbol === 'BTCUSDT');
                    if (btcTicker && btcTicker.lastPrice) {
                        console.log(`   BTC/USDT Price: $${parseFloat(btcTicker.lastPrice).toLocaleString()}`);
                        testResult('Has price data', parseFloat(btcTicker.lastPrice) > 0);
                    }
                }
            }
        } catch (error) {
            testResult('Ticker call successful', false, `Error: ${error.message}`);
        }
        console.log();

        // ========================================================================
        // Test 5: Verify Metrics Collection
        // ========================================================================
        console.log('📋 Test 5: Verify Metrics Collection');
        console.log('─────────────────────────────────────\n');

        const allMetrics = metricsCollector.getAllMetrics();
        testResult('Metrics collected', allMetrics.size > 0, `Tracked ${allMetrics.size} endpoints`);

        // Check specific endpoint metrics
        const timeMetrics = metricsCollector.getEndpointMetrics('public/time');
        if (timeMetrics) {
            testResult('Server time metrics exist', true);
            testResult('Call count correct', timeMetrics.totalCalls >= 1, `Total calls: ${timeMetrics.totalCalls}`);
            testResult('Success count correct', timeMetrics.successfulCalls >= 1, `Successful: ${timeMetrics.successfulCalls}`);
            testResult('Average latency calculated', timeMetrics.averageLatency > 0, `Avg: ${timeMetrics.averageLatency.toFixed(2)}ms`);
            testResult('Min latency calculated', timeMetrics.minLatency > 0, `Min: ${timeMetrics.minLatency.toFixed(2)}ms`);
            testResult('Max latency calculated', timeMetrics.maxLatency > 0, `Max: ${timeMetrics.maxLatency.toFixed(2)}ms`);
        } else {
            testResult('Server time metrics exist', false, 'Metrics not found for public/time');
        }
        console.log();

        // Get summary statistics
        const summary = metricsCollector.getSummary();
        console.log('Metrics Summary:');
        console.log(`  Total Endpoints: ${summary.totalEndpoints}`);
        console.log(`  Total API Calls: ${summary.totalCalls}`);
        console.log(`  Successful Calls: ${summary.totalSuccessfulCalls}`);
        console.log(`  Failed Calls: ${summary.totalFailedCalls}`);
        console.log(`  Success Rate: ${((summary.totalSuccessfulCalls / summary.totalCalls) * 100).toFixed(2)}%`);
        console.log(`  Overall Avg Latency: ${summary.averageLatency.toFixed(2)}ms`);

        testResult('Summary has correct total calls', summary.totalCalls >= 3, `Expected at least 3, got ${summary.totalCalls}`);
        testResult('Success rate is 100%', summary.totalFailedCalls === 0);
        console.log();

        // ========================================================================
        // Test 6: Percentile Calculations
        // ========================================================================
        console.log('📋 Test 6: Percentile Calculations');
        console.log('─────────────────────────────────────\n');

        // Make multiple calls to get meaningful percentiles
        console.log('Making 10 additional calls for percentile testing...');
        for (let i = 0; i < 10; i++) {
            try {
                await apiClient.call('publicGetTime');
                process.stdout.write('.');
            } catch (error) {
                process.stdout.write('x');
            }
        }
        console.log(' Done\n');

        const timeMetricsUpdated = metricsCollector.getEndpointMetrics('public/time');
        if (timeMetricsUpdated) {
            testResult('P50 (median) calculated', timeMetricsUpdated.p50Latency > 0, `P50: ${timeMetricsUpdated.p50Latency.toFixed(2)}ms`);
            testResult('P95 calculated', timeMetricsUpdated.p95Latency > 0, `P95: ${timeMetricsUpdated.p95Latency.toFixed(2)}ms`);
            testResult('P99 calculated', timeMetricsUpdated.p99Latency > 0, `P99: ${timeMetricsUpdated.p99Latency.toFixed(2)}ms`);
            testResult('P95 >= P50', timeMetricsUpdated.p95Latency >= timeMetricsUpdated.p50Latency);
            testResult('P99 >= P95', timeMetricsUpdated.p99Latency >= timeMetricsUpdated.p95Latency);

            console.log('\nLatency Percentiles:');
            console.log(`  Min:    ${timeMetricsUpdated.minLatency.toFixed(2)}ms`);
            console.log(`  P50:    ${timeMetricsUpdated.p50Latency.toFixed(2)}ms`);
            console.log(`  Average: ${timeMetricsUpdated.averageLatency.toFixed(2)}ms`);
            console.log(`  P95:    ${timeMetricsUpdated.p95Latency.toFixed(2)}ms`);
            console.log(`  P99:    ${timeMetricsUpdated.p99Latency.toFixed(2)}ms`);
            console.log(`  Max:    ${timeMetricsUpdated.maxLatency.toFixed(2)}ms`);
        }
        console.log();

        // ========================================================================
        // Test 7: Real-time Metrics Streaming
        // ========================================================================
        console.log('📋 Test 7: Real-time Metrics Streaming');
        console.log('─────────────────────────────────────\n');

        let streamedMetricsCount = 0;
        let lastStreamedResult: any = null;

        const unsubscribe = apiClient.subscribeMetrics((result) => {
            streamedMetricsCount++;
            lastStreamedResult = result;
        });

        testResult('Metrics subscription created', unsubscribe !== null);

        // Make a call to trigger streaming
        await apiClient.call('publicGetTime');

        testResult('Metrics streamed', streamedMetricsCount > 0, `Streamed ${streamedMetricsCount} metrics`);

        if (lastStreamedResult) {
            testResult('Streamed result has context', lastStreamedResult.context !== null);
            testResult('Streamed result has metrics', lastStreamedResult.metrics !== null);
            testResult('Streamed result has duration', lastStreamedResult.metrics.duration > 0);
        }

        unsubscribe();
        console.log('Unsubscribed from metrics stream');
        console.log();

        // ========================================================================
        // Test 8: Public Client Separation
        // ========================================================================
        console.log('📋 Test 8: Public Client Separation');
        console.log('─────────────────────────────────────\n');

        const publicClient = CcxtApiAdapter.createPublicClient(exchange);
        const privateClient = CcxtApiAdapter.createPrivateClient(exchange);

        testResult('Public client created', publicClient !== null);
        testResult('Private client created', privateClient !== null);
        testResult('Public client has endpoints', publicClient.getEndpoints().length > 0, `Public: ${publicClient.getEndpoints().length} endpoints`);
        testResult('Private client has endpoints', privateClient.getEndpoints().length > 0, `Private: ${privateClient.getEndpoints().length} endpoints`);

        // Verify public client works
        try {
            const publicResult = await publicClient.call('publicGetTime');
            testResult('Public client can make calls', publicResult.success === true);
        } catch (error) {
            testResult('Public client can make calls', false, `Error: ${error.message}`);
        }
        console.log();

        // ========================================================================
        // Test 9: Endpoint Filtering and Searching
        // ========================================================================
        console.log('📋 Test 9: Endpoint Filtering and Searching');
        console.log('─────────────────────────────────────\n');

        const getEndpoints = ApiExtractor.filterByMethod(apiDef.endpoints, 'GET');
        testResult('Filter by GET method works', getEndpoints.length > 0, `Found ${getEndpoints.length} GET endpoints`);

        const postEndpoints = ApiExtractor.filterByMethod(apiDef.endpoints, 'POST');
        testResult('Filter by POST method works', postEndpoints.length > 0, `Found ${postEndpoints.length} POST endpoints`);

        const tickerEndpoints = ApiExtractor.searchByPath(apiDef.endpoints, /ticker/i);
        testResult('Search by path works', tickerEndpoints.length > 0, `Found ${tickerEndpoints.length} ticker endpoints`);

        const byNamespace = ApiExtractor.groupByNamespace(apiDef.endpoints);
        testResult('Group by namespace works', byNamespace.size > 0, `Found ${byNamespace.size} namespaces`);
        console.log();

        // ========================================================================
        // Test 10: Documentation Generation
        // ========================================================================
        console.log('📋 Test 10: Documentation Generation');
        console.log('─────────────────────────────────────\n');

        const docs = CcxtApiAdapter.generateDocs(exchange);
        testResult('Markdown docs generated', docs.length > 0, `Generated ${docs.length} characters`);
        testResult('Docs contain headers', docs.includes('##'));
        testResult('Docs contain endpoint info', docs.includes('Method Name'));

        const openApiSpec = CcxtApiAdapter.generateOpenApiSpec(exchange);
        testResult('OpenAPI spec generated', openApiSpec !== null);
        testResult('OpenAPI has version', openApiSpec.openapi === '3.0.0');
        testResult('OpenAPI has paths', Object.keys(openApiSpec.paths).length > 0, `${Object.keys(openApiSpec.paths).length} paths`);

        const jsonExport = CcxtApiAdapter.exportToJson(exchange);
        const parsed = JSON.parse(jsonExport);
        testResult('JSON export works', parsed !== null);
        testResult('JSON has exchange ID', parsed.exchangeId === 'binance');
        console.log();

        // ========================================================================
        // Test Results Summary
        // ========================================================================
        console.log('╔════════════════════════════════════════════════════════════════╗');
        console.log('║                        Test Results                            ║');
        console.log('╚════════════════════════════════════════════════════════════════╝\n');

        console.log(`Total Tests: ${passedTests + failedTests}`);
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${failedTests}`);
        console.log(`Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(2)}%\n`);

        if (failedTests === 0) {
            console.log('🎉 All tests passed! The Universal API Client module is working correctly.\n');
            return 0;
        } else {
            console.log('⚠️  Some tests failed. Please review the errors above.\n');
            return 1;
        }

    } catch (error) {
        console.error('\n❌ Fatal error during testing:');
        console.error(error);
        return 1;
    }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
    publicApiSanityTest()
        .then((exitCode) => {
            process.exit(exitCode);
        })
        .catch((error) => {
            console.error('Test execution failed:', error);
            process.exit(1);
        });
}

export { publicApiSanityTest };
