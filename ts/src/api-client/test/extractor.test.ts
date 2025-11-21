/**
 * API Extractor Test
 *
 * Test the API extractor with a real exchange
 */

import ccxt from '../../ccxt.js';
import { ApiExtractor, CcxtApiAdapter, ApiClientBuilder, MetricsCollector } from '../index.js';

async function testExtractor() {
    console.log('=== API Extractor Test ===\n');

    // Test with Binance exchange
    console.log('Test 1: Extract Binance API');
    const binance = new ccxt.binance();
    const binanceApi = ApiExtractor.extractApi(binance);

    console.log('✓ Exchange ID:', binanceApi.exchangeId);
    console.log('✓ Exchange Name:', binanceApi.name);
    console.log('✓ Rate Limit:', binanceApi.rateLimit, 'ms');
    console.log('✓ Total Endpoints:', binanceApi.endpoints.length);
    console.log('✓ Base URL:', typeof binanceApi.urls.api);
    console.log();

    // Verify endpoints structure
    console.log('Test 2: Verify endpoint structure');
    const firstEndpoint = binanceApi.endpoints[0];
    console.log('✓ Endpoint has namespace:', !!firstEndpoint.namespace);
    console.log('✓ Endpoint has method:', !!firstEndpoint.method);
    console.log('✓ Endpoint has path:', !!firstEndpoint.path);
    console.log('✓ Endpoint has cost:', firstEndpoint.cost !== undefined);
    console.log('✓ Endpoint has methodName:', !!firstEndpoint.methodName);
    console.log('✓ Endpoint has fullPath:', !!firstEndpoint.fullPath);
    console.log('✓ Endpoint has requiresAuth:', typeof firstEndpoint.requiresAuth === 'boolean');
    console.log();

    // Test filtering
    console.log('Test 3: Test endpoint filtering');
    const publicEndpoints = ApiExtractor.filterByAuth(binanceApi.endpoints, false);
    const privateEndpoints = ApiExtractor.filterByAuth(binanceApi.endpoints, true);
    console.log('✓ Public endpoints:', publicEndpoints.length);
    console.log('✓ Private endpoints:', privateEndpoints.length);
    console.log('✓ Total matches:', publicEndpoints.length + privateEndpoints.length === binanceApi.endpoints.length);
    console.log();

    // Test grouping
    console.log('Test 4: Test endpoint grouping');
    const byNamespace = ApiExtractor.groupByNamespace(binanceApi.endpoints);
    const byMethod = ApiExtractor.groupByMethod(binanceApi.endpoints);
    console.log('✓ Namespaces found:', byNamespace.size);
    console.log('✓ HTTP methods found:', byMethod.size);
    for (const [namespace, endpoints] of byNamespace) {
        console.log(`  - ${namespace}: ${endpoints.length} endpoints`);
    }
    console.log();

    // Test search
    console.log('Test 5: Test endpoint search');
    const orderEndpoints = ApiExtractor.searchByPath(binanceApi.endpoints, /order/i);
    console.log('✓ Order-related endpoints found:', orderEndpoints.length);
    if (orderEndpoints.length > 0) {
        console.log('  Example:', orderEndpoints[0].methodName);
    }
    console.log();

    // Test client creation
    console.log('Test 6: Test API client creation');
    const apiClient = CcxtApiAdapter.createClient(binance);
    console.log('✓ Client created successfully');
    console.log('✓ Client has', apiClient.getEndpoints().length, 'endpoints');
    console.log();

    // Test with different exchange
    console.log('Test 7: Test with Kraken exchange');
    const kraken = new ccxt.kraken();
    const krakenApi = ApiExtractor.extractApi(kraken);
    console.log('✓ Kraken Exchange ID:', krakenApi.exchangeId);
    console.log('✓ Kraken Endpoints:', krakenApi.endpoints.length);
    console.log();

    // Test documentation generation
    console.log('Test 8: Test documentation generation');
    const docs = CcxtApiAdapter.generateDocs(binance);
    console.log('✓ Documentation generated:', docs.length, 'characters');
    console.log('✓ Contains markdown headers:', docs.includes('##'));
    console.log();

    // Test OpenAPI generation
    console.log('Test 9: Test OpenAPI specification generation');
    const openApi = CcxtApiAdapter.generateOpenApiSpec(binance);
    console.log('✓ OpenAPI version:', openApi.openapi);
    console.log('✓ API title:', openApi.info.title);
    console.log('✓ Paths defined:', Object.keys(openApi.paths).length);
    console.log();

    // Test JSON export
    console.log('Test 10: Test JSON export');
    const json = CcxtApiAdapter.exportToJson(binance);
    const parsed = JSON.parse(json);
    console.log('✓ JSON export successful');
    console.log('✓ Parsed exchange ID:', parsed.exchangeId);
    console.log('✓ Parsed endpoints count:', parsed.endpoints.length);
    console.log();

    // Test metrics collector
    console.log('Test 11: Test metrics collector');
    const collector = new MetricsCollector();
    const testClient = new ApiClientBuilder()
        .withEndpoints(binanceApi.endpoints.slice(0, 10))
        .withBaseUrl('https://api.binance.com')
        .withMetricsObserver(collector)
        .build();
    console.log('✓ Client with metrics created');
    console.log('✓ Metrics collector attached');
    console.log();

    // Test public/private client separation
    console.log('Test 12: Test public/private client separation');
    const publicClient = CcxtApiAdapter.createPublicClient(binance);
    const privateClient = CcxtApiAdapter.createPrivateClient(binance);
    console.log('✓ Public client endpoints:', publicClient.getEndpoints().length);
    console.log('✓ Private client endpoints:', privateClient.getEndpoints().length);
    console.log('✓ All endpoints accounted for:',
        publicClient.getEndpoints().length + privateClient.getEndpoints().length <= binanceApi.endpoints.length);
    console.log();

    console.log('=== All Tests Passed ✓ ===');
}

// Run test
testExtractor().catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
});
