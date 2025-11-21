/**
 * API Extractor
 *
 * Extracts exchange API definitions from CCXT Exchange instances
 * into universal API endpoint definitions
 */

import Exchange from '../base/Exchange.js';
import {
    ApiEndpoint,
    ExchangeApiDefinition,
    HttpMethod,
} from './types.js';

/**
 * Extracts API endpoints from a CCXT Exchange instance
 */
export class ApiExtractor {
    /**
     * Extract complete API definition from an exchange
     */
    static extractApi(exchange: Exchange): ExchangeApiDefinition {
        const endpoints = this.extractEndpoints(exchange);

        return {
            exchangeId: exchange.id,
            name: exchange.name || exchange.id,
            urls: {
                api: exchange.urls?.api,
                www: exchange.urls?.www,
                doc: exchange.urls?.doc,
            },
            endpoints,
            rateLimit: exchange.rateLimit || 1000,
            has: { ...exchange.has },
        };
    }

    /**
     * Extract all endpoints from exchange API definition
     */
    static extractEndpoints(exchange: Exchange): ApiEndpoint[] {
        const endpoints: ApiEndpoint[] = [];
        const api = exchange.api;

        if (!api || typeof api !== 'object') {
            return endpoints;
        }

        // Iterate through API namespaces (e.g., 'sapi', 'private', 'public')
        for (const [namespace, methods] of Object.entries(api)) {
            if (!methods || typeof methods !== 'object') {
                continue;
            }

            // Iterate through HTTP methods (e.g., 'get', 'post')
            for (const [method, paths] of Object.entries(methods)) {
                if (!paths || typeof paths !== 'object') {
                    continue;
                }

                const httpMethod = method.toUpperCase() as HttpMethod;

                // Iterate through paths
                for (const [path, config] of Object.entries(paths)) {
                    const endpoint = this.createEndpoint(
                        namespace,
                        httpMethod,
                        path,
                        config,
                        exchange
                    );
                    endpoints.push(endpoint);
                }
            }
        }

        return endpoints;
    }

    /**
     * Create an ApiEndpoint from raw configuration
     */
    private static createEndpoint(
        namespace: string,
        method: HttpMethod,
        path: string,
        config: any,
        exchange: Exchange
    ): ApiEndpoint {
        // Parse cost configuration
        let cost: number | Record<string, any>;
        if (typeof config === 'number') {
            cost = config;
        } else if (typeof config === 'object' && config !== null) {
            if ('cost' in config) {
                cost = config.cost;
            } else {
                cost = config;
            }
        } else {
            cost = 1;
        }

        // Generate method name (camelCase)
        const methodName = this.generateMethodName(namespace, method, path);

        // Determine if authentication is required
        const requiresAuth = this.requiresAuthentication(namespace, exchange);

        return {
            namespace,
            method,
            path,
            cost,
            methodName,
            fullPath: `${namespace}/${path}`,
            requiresAuth,
        };
    }

    /**
     * Generate camelCase method name from namespace, method, and path
     * Following CCXT's naming convention
     */
    private static generateMethodName(
        namespace: string,
        method: HttpMethod,
        path: string
    ): string {
        // Convert namespace to camelCase
        const namespacePart = this.toCamelCase(namespace);

        // Convert method to first-char uppercase
        const methodPart = method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();

        // Convert path to camelCase, removing slashes
        const pathPart = path
            .split('/')
            .map((segment) => this.toCamelCase(segment, true))
            .join('');

        return `${namespacePart}${methodPart}${pathPart}`;
    }

    /**
     * Convert string to camelCase
     */
    private static toCamelCase(str: string, capitalizeFirst: boolean = false): string {
        const parts = str.split(/[-_\s]+/);
        let result = parts[0].toLowerCase();

        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            result += part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        }

        if (capitalizeFirst && result.length > 0) {
            result = result.charAt(0).toUpperCase() + result.slice(1);
        }

        return result;
    }

    /**
     * Determine if a namespace requires authentication
     * Common private namespaces: private, sapi, fapi, dapi, papi, etc.
     */
    private static requiresAuthentication(namespace: string, exchange: Exchange): boolean {
        const lowerNamespace = namespace.toLowerCase();

        // Common patterns for private endpoints
        const privatePatterns = [
            'private',
            'sapi',
            'fapi',
            'dapi',
            'papi',
            'user',
            'account',
            'trade',
            'trading',
            'spot',
            'margin',
            'futures',
            'swap',
            'options',
        ];

        // Check if namespace contains any private pattern
        for (const pattern of privatePatterns) {
            if (lowerNamespace.includes(pattern)) {
                // Exception: some exchanges have 'public' variants
                if (lowerNamespace.includes('public')) {
                    return false;
                }
                return true;
            }
        }

        // Explicitly public namespaces
        const publicPatterns = ['public', 'market', 'data'];
        for (const pattern of publicPatterns) {
            if (lowerNamespace.includes(pattern)) {
                return false;
            }
        }

        // Default to public if uncertain
        return false;
    }

    /**
     * Filter endpoints by namespace
     */
    static filterByNamespace(
        endpoints: ApiEndpoint[],
        namespace: string | string[]
    ): ApiEndpoint[] {
        const namespaces = Array.isArray(namespace) ? namespace : [namespace];
        return endpoints.filter((endpoint) => namespaces.includes(endpoint.namespace));
    }

    /**
     * Filter endpoints by HTTP method
     */
    static filterByMethod(endpoints: ApiEndpoint[], method: HttpMethod | HttpMethod[]): ApiEndpoint[] {
        const methods = Array.isArray(method) ? method : [method];
        return endpoints.filter((endpoint) => methods.includes(endpoint.method));
    }

    /**
     * Filter endpoints that require authentication
     */
    static filterByAuth(endpoints: ApiEndpoint[], requiresAuth: boolean): ApiEndpoint[] {
        return endpoints.filter((endpoint) => endpoint.requiresAuth === requiresAuth);
    }

    /**
     * Group endpoints by namespace
     */
    static groupByNamespace(endpoints: ApiEndpoint[]): Map<string, ApiEndpoint[]> {
        const groups = new Map<string, ApiEndpoint[]>();

        for (const endpoint of endpoints) {
            const group = groups.get(endpoint.namespace) || [];
            group.push(endpoint);
            groups.set(endpoint.namespace, group);
        }

        return groups;
    }

    /**
     * Group endpoints by HTTP method
     */
    static groupByMethod(endpoints: ApiEndpoint[]): Map<HttpMethod, ApiEndpoint[]> {
        const groups = new Map<HttpMethod, ApiEndpoint[]>();

        for (const endpoint of endpoints) {
            const group = groups.get(endpoint.method) || [];
            group.push(endpoint);
            groups.set(endpoint.method, group);
        }

        return groups;
    }

    /**
     * Search endpoints by path pattern
     */
    static searchByPath(endpoints: ApiEndpoint[], pattern: string | RegExp): ApiEndpoint[] {
        const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
        return endpoints.filter((endpoint) => regex.test(endpoint.path));
    }

    /**
     * Get endpoint by method name
     */
    static getByMethodName(endpoints: ApiEndpoint[], methodName: string): ApiEndpoint | undefined {
        return endpoints.find((endpoint) => endpoint.methodName === methodName);
    }

    /**
     * Generate OpenAPI-like specification from endpoints
     */
    static generateOpenApiSpec(definition: ExchangeApiDefinition): any {
        const paths: any = {};

        for (const endpoint of definition.endpoints) {
            const path = `/${endpoint.fullPath}`;
            if (!paths[path]) {
                paths[path] = {};
            }

            const method = endpoint.method.toLowerCase();
            paths[path][method] = {
                operationId: endpoint.methodName,
                tags: [endpoint.namespace],
                summary: `${endpoint.method} ${endpoint.path}`,
                parameters: [],
                responses: {
                    '200': {
                        description: 'Successful response',
                    },
                },
                security: endpoint.requiresAuth ? [{ ApiKeyAuth: [] }] : [],
                'x-rate-limit-cost': endpoint.cost,
            };
        }

        return {
            openapi: '3.0.0',
            info: {
                title: `${definition.name} API`,
                version: '1.0.0',
            },
            servers: [
                {
                    url: typeof definition.urls.api === 'string' ? definition.urls.api : '',
                },
            ],
            paths,
            components: {
                securitySchemes: {
                    ApiKeyAuth: {
                        type: 'apiKey',
                        in: 'header',
                        name: 'X-API-KEY',
                    },
                },
            },
        };
    }

    /**
     * Export endpoints to JSON
     */
    static exportToJson(definition: ExchangeApiDefinition): string {
        return JSON.stringify(definition, null, 2);
    }

    /**
     * Generate markdown documentation
     */
    static generateMarkdownDocs(definition: ExchangeApiDefinition): string {
        const lines: string[] = [];

        lines.push(`# ${definition.name} API Reference`);
        lines.push('');
        lines.push(`Exchange ID: \`${definition.exchangeId}\``);
        lines.push(`Rate Limit: ${definition.rateLimit}ms`);
        lines.push(`Total Endpoints: ${definition.endpoints.length}`);
        lines.push('');

        // Group by namespace
        const groups = this.groupByNamespace(definition.endpoints);

        for (const [namespace, endpoints] of groups) {
            lines.push(`## ${namespace}`);
            lines.push('');

            // Group by method within namespace
            const methodGroups = this.groupByMethod(endpoints);

            for (const [method, methodEndpoints] of methodGroups) {
                lines.push(`### ${method}`);
                lines.push('');
                lines.push('| Method Name | Path | Cost | Auth |');
                lines.push('|-------------|------|------|------|');

                for (const endpoint of methodEndpoints) {
                    const cost = typeof endpoint.cost === 'number' ? endpoint.cost : 'dynamic';
                    const auth = endpoint.requiresAuth ? '🔒' : '🔓';
                    lines.push(
                        `| \`${endpoint.methodName}()\` | ${endpoint.path} | ${cost} | ${auth} |`
                    );
                }

                lines.push('');
            }
        }

        return lines.join('\n');
    }
}
