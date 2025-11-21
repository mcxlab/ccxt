/**
 * CCXT API Adapter
 *
 * Adapter that integrates UniversalApiClient with CCXT Exchange instances
 * Provides a bridge between CCXT and the universal API client
 */

import Exchange from '../base/Exchange.js';
import { ApiExtractor } from './ApiExtractor.js';
import { UniversalApiClient, ApiClientBuilder } from './UniversalApiClient.js';
import { MetricsCollector } from './MetricsCollector.js';
import { ExchangeApiDefinition } from './types.js';

/**
 * Creates a UniversalApiClient from a CCXT Exchange instance
 */
export class CcxtApiAdapter {
    /**
     * Create API client from CCXT exchange
     */
    static createClient(exchange: Exchange, options?: {
        enableRateLimit?: boolean;
        timeout?: number;
        customHeaders?: Record<string, string>;
        metricsCollector?: MetricsCollector;
    }): UniversalApiClient {
        // Extract API definition
        const apiDef = ApiExtractor.extractApi(exchange);

        // Get base URL
        const baseUrl = this.getBaseUrl(exchange);

        // Build client
        const builder = new ApiClientBuilder()
            .withEndpoints(apiDef.endpoints)
            .withBaseUrl(baseUrl)
            .withRateLimit(apiDef.rateLimit);

        // Set credentials if available
        if (exchange.apiKey) {
            builder.withCredentials(exchange.apiKey, exchange.secret);
        }

        // Apply options
        if (options) {
            if (options.enableRateLimit !== undefined) {
                if (options.enableRateLimit) {
                    builder.withRateLimit(apiDef.rateLimit);
                }
            }
            if (options.timeout) {
                builder.withTimeout(options.timeout);
            }
            if (options.customHeaders) {
                builder.withHeaders(options.customHeaders);
            }
            if (options.metricsCollector) {
                builder.withMetricsObserver(options.metricsCollector);
            }
        }

        return builder.build();
    }

    /**
     * Extract and export API definition
     */
    static extractApiDefinition(exchange: Exchange): ExchangeApiDefinition {
        return ApiExtractor.extractApi(exchange);
    }

    /**
     * Generate documentation for exchange API
     */
    static generateDocs(exchange: Exchange): string {
        const apiDef = ApiExtractor.extractApi(exchange);
        return ApiExtractor.generateMarkdownDocs(apiDef);
    }

    /**
     * Export API definition to JSON
     */
    static exportToJson(exchange: Exchange): string {
        const apiDef = ApiExtractor.extractApi(exchange);
        return ApiExtractor.exportToJson(apiDef);
    }

    /**
     * Generate OpenAPI specification
     */
    static generateOpenApiSpec(exchange: Exchange): any {
        const apiDef = ApiExtractor.extractApi(exchange);
        return ApiExtractor.generateOpenApiSpec(apiDef);
    }

    /**
     * Get base URL from exchange
     */
    private static getBaseUrl(exchange: Exchange): string {
        if (!exchange.urls || !exchange.urls.api) {
            throw new Error(`Exchange ${exchange.id} has no API URL configured`);
        }

        const api = exchange.urls.api;

        if (typeof api === 'string') {
            return api;
        }

        // If api is an object, try to get the first available URL
        if (typeof api === 'object') {
            // Try common keys
            const keys = ['rest', 'public', 'private', 'trade', 'spot'];
            for (const key of keys) {
                if (api[key]) {
                    return api[key];
                }
            }

            // Get first available URL
            const firstKey = Object.keys(api)[0];
            if (firstKey && api[firstKey]) {
                return api[firstKey];
            }
        }

        throw new Error(`Could not determine base URL for exchange ${exchange.id}`);
    }

    /**
     * Create multiple clients for different API namespaces
     * Useful when exchange has separate URLs for different endpoints
     */
    static createNamespacedClients(exchange: Exchange): Map<string, UniversalApiClient> {
        const apiDef = ApiExtractor.extractApi(exchange);
        const clients = new Map<string, UniversalApiClient>();

        // Group endpoints by namespace
        const namespaces = ApiExtractor.groupByNamespace(apiDef.endpoints);

        // Check if exchange has namespace-specific URLs
        const urls = exchange.urls?.api;
        const hasNamespacedUrls = typeof urls === 'object' && urls !== null;

        for (const [namespace, endpoints] of namespaces) {
            let baseUrl: string;

            if (hasNamespacedUrls && urls[namespace]) {
                baseUrl = urls[namespace];
            } else {
                baseUrl = this.getBaseUrl(exchange);
            }

            const client = new ApiClientBuilder()
                .withEndpoints(endpoints)
                .withBaseUrl(baseUrl)
                .withRateLimit(apiDef.rateLimit)
                .build();

            if (exchange.apiKey) {
                // Note: credentials would be set via builder
            }

            clients.set(namespace, client);
        }

        return clients;
    }

    /**
     * Create a client with custom endpoint filtering
     */
    static createFilteredClient(
        exchange: Exchange,
        filter: (endpoint: import('./types.js').ApiEndpoint) => boolean
    ): UniversalApiClient {
        const apiDef = ApiExtractor.extractApi(exchange);
        const filteredEndpoints = apiDef.endpoints.filter(filter);

        const baseUrl = this.getBaseUrl(exchange);

        const client = new ApiClientBuilder()
            .withEndpoints(filteredEndpoints)
            .withBaseUrl(baseUrl)
            .withRateLimit(apiDef.rateLimit)
            .build();

        return client;
    }

    /**
     * Create a client with only public endpoints (no auth required)
     */
    static createPublicClient(exchange: Exchange): UniversalApiClient {
        return this.createFilteredClient(exchange, (endpoint) => !endpoint.requiresAuth);
    }

    /**
     * Create a client with only private endpoints (auth required)
     */
    static createPrivateClient(exchange: Exchange): UniversalApiClient {
        const client = this.createFilteredClient(exchange, (endpoint) => endpoint.requiresAuth);

        // Ensure credentials are set for private client
        if (!exchange.apiKey || !exchange.secret) {
            console.warn(
                `Warning: Creating private client for ${exchange.id} without credentials`
            );
        }

        return client;
    }
}
