/**
 * API Extraction Example
 *
 * Demonstrates how to extract and analyze exchange API definitions
 */

import ccxt from '../../ccxt.js';
import { ApiExtractor, CcxtApiAdapter } from '../index.js';

async function apiExtractionExample() {
    console.log('=== API Extraction Example ===\n');

    // Create exchange instance
    const exchange = new ccxt.binance();

    // Extract API definition
    console.log('Extracting API definition...');
    const apiDef = ApiExtractor.extractApi(exchange);

    console.log('Exchange ID:', apiDef.exchangeId);
    console.log('Exchange Name:', apiDef.name);
    console.log('Rate Limit:', apiDef.rateLimit, 'ms');
    console.log('Total Endpoints:', apiDef.endpoints.length);
    console.log();

    // Group endpoints by namespace
    console.log('=== Endpoints by Namespace ===\n');
    const byNamespace = ApiExtractor.groupByNamespace(apiDef.endpoints);
    for (const [namespace, endpoints] of byNamespace) {
        console.log(`${namespace}: ${endpoints.length} endpoints`);
    }
    console.log();

    // Group by HTTP method
    console.log('=== Endpoints by HTTP Method ===\n');
    const byMethod = ApiExtractor.groupByMethod(apiDef.endpoints);
    for (const [method, endpoints] of byMethod) {
        console.log(`${method}: ${endpoints.length} endpoints`);
    }
    console.log();

    // Filter public vs private endpoints
    console.log('=== Public vs Private Endpoints ===\n');
    const publicEndpoints = ApiExtractor.filterByAuth(apiDef.endpoints, false);
    const privateEndpoints = ApiExtractor.filterByAuth(apiDef.endpoints, true);
    console.log('Public endpoints:', publicEndpoints.length);
    console.log('Private endpoints:', privateEndpoints.length);
    console.log();

    // Search for specific endpoints
    console.log('=== Search Examples ===\n');
    const orderEndpoints = ApiExtractor.searchByPath(apiDef.endpoints, /order/i);
    console.log('Order-related endpoints:', orderEndpoints.length);

    const balanceEndpoints = ApiExtractor.searchByPath(apiDef.endpoints, /balance/i);
    console.log('Balance-related endpoints:', balanceEndpoints.length);
    console.log();

    // Show some example endpoints
    console.log('=== Sample Endpoints ===\n');
    for (let i = 0; i < Math.min(10, apiDef.endpoints.length); i++) {
        const ep = apiDef.endpoints[i];
        console.log(`${ep.methodName}()`);
        console.log(`  Method: ${ep.method}`);
        console.log(`  Path: ${ep.fullPath}`);
        console.log(`  Cost: ${typeof ep.cost === 'number' ? ep.cost : 'dynamic'}`);
        console.log(`  Auth: ${ep.requiresAuth ? 'Required' : 'Not required'}`);
        console.log();
    }

    // Generate documentation
    console.log('=== Generated Documentation ===\n');
    const docs = CcxtApiAdapter.generateDocs(exchange);
    console.log(docs.substring(0, 1000) + '...\n'); // Show first 1000 chars

    // Generate OpenAPI spec
    console.log('=== OpenAPI Specification ===\n');
    const openApiSpec = CcxtApiAdapter.generateOpenApiSpec(exchange);
    console.log('OpenAPI Version:', openApiSpec.openapi);
    console.log('API Title:', openApiSpec.info.title);
    console.log('Total Paths:', Object.keys(openApiSpec.paths).length);
    console.log();

    // Export to JSON
    console.log('=== JSON Export (first 500 chars) ===\n');
    const json = CcxtApiAdapter.exportToJson(exchange);
    console.log(json.substring(0, 500) + '...');
}

// Run example
if (import.meta.url === `file://${process.argv[1]}`) {
    apiExtractionExample().catch(console.error);
}

export { apiExtractionExample };
