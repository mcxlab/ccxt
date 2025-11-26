/**
 * API Extraction Demonstration
 *
 * Shows successfully extracted endpoints from Binance, Kraken, and OKX
 * Demonstrates the module works correctly even without making actual API calls
 */

import Binance from '../../binance.js';
import Kraken from '../../kraken.js';
import Okx from '../../okx.js';
import {
    ApiExtractor,
    CcxtApiAdapter,
} from '../index.js';

function extractionDemo() {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║          API Extraction Demo - Multi-Exchange                 ║');
    console.log('║           Binance • Kraken • OKX                               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    const exchanges = [
        { name: 'Binance', instance: new Binance() },
        { name: 'Kraken', instance: new Kraken() },
        { name: 'OKX', instance: new Okx() },
    ];

    for (const { name, instance: exchange } of exchanges) {
        console.log('\n' + '═'.repeat(68));
        console.log(`  ${name.toUpperCase()}`);
        console.log('═'.repeat(68) + '\n');

        // Extract API definition
        const apiDef = ApiExtractor.extractApi(exchange);

        console.log('📊 Basic Information:');
        console.log(`   Exchange ID: ${apiDef.exchangeId}`);
        console.log(`   Exchange Name: ${apiDef.name}`);
        console.log(`   Rate Limit: ${apiDef.rateLimit}ms`);
        console.log(`   Total Endpoints: ${apiDef.endpoints.length}`);
        console.log();

        // Analyze endpoints
        const publicEndpoints = ApiExtractor.filterByAuth(apiDef.endpoints, false);
        const privateEndpoints = ApiExtractor.filterByAuth(apiDef.endpoints, true);

        console.log('🔓 Public vs Private:');
        console.log(`   Public Endpoints: ${publicEndpoints.length}`);
        console.log(`   Private Endpoints: ${privateEndpoints.length}`);
        console.log();

        // Group by HTTP method
        const byMethod = ApiExtractor.groupByMethod(apiDef.endpoints);
        console.log('📡 HTTP Methods:');
        for (const [method, endpoints] of byMethod) {
            console.log(`   ${method}: ${endpoints.length} endpoints`);
        }
        console.log();

        // Group by namespace
        const byNamespace = ApiExtractor.groupByNamespace(apiDef.endpoints);
        console.log('📁 Namespaces:');
        for (const [namespace, endpoints] of byNamespace) {
            const publicCount = endpoints.filter(e => !e.requiresAuth).length;
            const privateCount = endpoints.filter(e => e.requiresAuth).length;
            console.log(`   ${namespace}: ${endpoints.length} total (${publicCount} public, ${privateCount} private)`);
        }
        console.log();

        // Show sample public endpoints
        console.log('🔍 Sample Public Endpoints (first 10):');
        const samplePublic = publicEndpoints.slice(0, 10);
        for (const endpoint of samplePublic) {
            const cost = typeof endpoint.cost === 'number' ? endpoint.cost : 'dynamic';
            console.log(`   ${endpoint.method.padEnd(6)} ${endpoint.fullPath.padEnd(40)} [Cost: ${cost}]`);
            console.log(`          → ${endpoint.methodName}()`);
        }
        console.log();

        // Show sample private endpoints
        console.log('🔒 Sample Private Endpoints (first 5):');
        const samplePrivate = privateEndpoints.slice(0, 5);
        for (const endpoint of samplePrivate) {
            const cost = typeof endpoint.cost === 'number' ? endpoint.cost : 'dynamic';
            console.log(`   ${endpoint.method.padEnd(6)} ${endpoint.fullPath.padEnd(40)} [Cost: ${cost}]`);
            console.log(`          → ${endpoint.methodName}()`);
        }
        console.log();

        // Search for specific endpoint types
        const orderEndpoints = ApiExtractor.searchByPath(apiDef.endpoints, /order/i);
        const balanceEndpoints = ApiExtractor.searchByPath(apiDef.endpoints, /balance/i);
        const tickerEndpoints = ApiExtractor.searchByPath(apiDef.endpoints, /ticker/i);
        const tradeEndpoints = ApiExtractor.searchByPath(apiDef.endpoints, /trade/i);

        console.log('🔎 Endpoint Categories:');
        console.log(`   Order-related: ${orderEndpoints.length}`);
        console.log(`   Balance-related: ${balanceEndpoints.length}`);
        console.log(`   Ticker-related: ${tickerEndpoints.length}`);
        console.log(`   Trade-related: ${tradeEndpoints.length}`);
        console.log();

        // Generate documentation sample
        console.log('📝 Documentation Generation:');
        const docs = CcxtApiAdapter.generateDocs(exchange);
        console.log(`   Markdown docs: ${docs.length} characters`);

        const openApiSpec = CcxtApiAdapter.generateOpenApiSpec(exchange);
        console.log(`   OpenAPI paths: ${Object.keys(openApiSpec.paths).length}`);

        const jsonExport = CcxtApiAdapter.exportToJson(exchange);
        console.log(`   JSON export: ${jsonExport.length} characters`);
        console.log();
    }

    // Final summary
    console.log('\n' + '═'.repeat(68));
    console.log('  EXTRACTION SUMMARY');
    console.log('═'.repeat(68) + '\n');

    console.log('✅ Successfully extracted API definitions from 3 exchanges');
    console.log('✅ Total endpoints extracted:');

    let totalEndpoints = 0;
    let totalPublic = 0;
    let totalPrivate = 0;

    for (const { instance: exchange } of exchanges) {
        const apiDef = ApiExtractor.extractApi(exchange);
        const publicCount = ApiExtractor.filterByAuth(apiDef.endpoints, false).length;
        const privateCount = ApiExtractor.filterByAuth(apiDef.endpoints, true).length;

        console.log(`   ${exchange.id}: ${apiDef.endpoints.length} (${publicCount} public, ${privateCount} private)`);

        totalEndpoints += apiDef.endpoints.length;
        totalPublic += publicCount;
        totalPrivate += privateCount;
    }

    console.log();
    console.log(`📊 Grand Total: ${totalEndpoints} endpoints`);
    console.log(`   Public: ${totalPublic}`);
    console.log(`   Private: ${totalPrivate}`);
    console.log();

    console.log('✨ Module Features Demonstrated:');
    console.log('   ✅ API extraction from CCXT exchanges');
    console.log('   ✅ Endpoint categorization (public/private)');
    console.log('   ✅ HTTP method grouping');
    console.log('   ✅ Namespace organization');
    console.log('   ✅ Method name generation');
    console.log('   ✅ Cost tracking');
    console.log('   ✅ Endpoint searching and filtering');
    console.log('   ✅ Documentation generation (Markdown, OpenAPI, JSON)');
    console.log();

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║              🎉 EXTRACTION SUCCESSFUL! 🎉                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
}

// Run demo
if (import.meta.url === `file://${process.argv[1]}`) {
    extractionDemo();
}

export { extractionDemo };
