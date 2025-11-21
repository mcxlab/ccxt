/**
 * Universal API Client
 *
 * Standalone, plug-and-play API client with latency metrics observability
 * Pure interface: one method for one API endpoint, no non-essential calls
 */

import {
    IApiClient,
    ApiClientConfig,
    ApiEndpoint,
    ApiCallContext,
    ApiCallResult,
    EndpointMetrics,
    HttpMethod,
    LatencyMetrics,
    MetricsObserver,
} from './types.js';
import { MetricsCollector, MetricsStream } from './MetricsCollector.js';

/**
 * Universal API client implementation
 */
export class UniversalApiClient implements IApiClient {
    private config: ApiClientConfig;
    private endpoints: Map<string, ApiEndpoint>;
    private metricsObserver: MetricsObserver;
    private metricsStream: MetricsStream;
    private lastRequestTime: number = 0;
    private requestQueue: Array<() => void> = [];
    private isProcessingQueue: boolean = false;

    constructor(endpoints: ApiEndpoint[], config: ApiClientConfig) {
        this.config = { ...config };
        this.endpoints = new Map();
        this.metricsStream = new MetricsStream();

        // Initialize metrics observer
        this.metricsObserver = config.metricsObserver || new MetricsCollector();

        // Index endpoints by method name
        for (const endpoint of endpoints) {
            this.endpoints.set(endpoint.methodName, endpoint);
        }

        // Generate dynamic methods for each endpoint
        this.generateEndpointMethods();
    }

    /**
     * Get the configuration
     */
    getConfig(): ApiClientConfig {
        return { ...this.config };
    }

    /**
     * Get all available endpoints
     */
    getEndpoints(): ApiEndpoint[] {
        return Array.from(this.endpoints.values());
    }

    /**
     * Get endpoint by method name
     */
    getEndpoint(methodName: string): ApiEndpoint | undefined {
        return this.endpoints.get(methodName);
    }

    /**
     * Make an API call by method name
     */
    async call<T = any>(
        methodName: string,
        params: Record<string, any> = {}
    ): Promise<ApiCallResult<T>> {
        const endpoint = this.endpoints.get(methodName);
        if (!endpoint) {
            throw new Error(`Unknown endpoint method: ${methodName}`);
        }

        return this.executeRequest<T>(endpoint, params);
    }

    /**
     * Make a raw HTTP request
     */
    async request<T = any>(
        method: HttpMethod,
        path: string,
        params: Record<string, any> = {},
        headers: Record<string, string> = {}
    ): Promise<ApiCallResult<T>> {
        // Create a temporary endpoint for raw requests
        const endpoint: ApiEndpoint = {
            namespace: 'raw',
            method,
            path,
            cost: 1,
            methodName: 'raw',
            fullPath: path,
            requiresAuth: false,
        };

        return this.executeRequest<T>(endpoint, params, headers);
    }

    /**
     * Get metrics observer
     */
    getMetricsObserver(): MetricsObserver {
        return this.metricsObserver;
    }

    /**
     * Get aggregated metrics for an endpoint
     */
    getEndpointMetrics(endpoint: string): EndpointMetrics | undefined {
        return this.metricsObserver.getEndpointMetrics(endpoint);
    }

    /**
     * Get all metrics
     */
    getAllMetrics(): Map<string, EndpointMetrics> {
        return this.metricsObserver.getAllMetrics();
    }

    /**
     * Subscribe to real-time metrics
     */
    subscribeMetrics(callback: (result: ApiCallResult) => void): () => void {
        return this.metricsStream.subscribe(callback);
    }

    /**
     * Execute an API request with full observability
     */
    private async executeRequest<T>(
        endpoint: ApiEndpoint,
        params: Record<string, any> = {},
        customHeaders: Record<string, string> = {}
    ): Promise<ApiCallResult<T>> {
        // Create call context
        const context: ApiCallContext = {
            callId: this.generateCallId(),
            endpoint,
            params,
            headers: customHeaders,
            timestamp: Date.now(),
        };

        // Notify observer that call is starting
        this.metricsObserver.onCallStart(context);

        // Start latency tracking
        const metrics: LatencyMetrics = {
            startTime: Date.now(),
            endTime: 0,
            duration: 0,
        };

        try {
            // Apply rate limiting if enabled
            if (this.config.enableRateLimit) {
                const rateLimitDelay = await this.throttle(endpoint);
                metrics.rateLimitDelay = rateLimitDelay;
            }

            // Build request
            const url = this.buildUrl(endpoint, params);
            const headers = this.buildHeaders(endpoint, customHeaders);
            const body = this.buildBody(endpoint, params);

            // Execute HTTP request
            const fetchStart = Date.now();
            const response = await this.fetch(endpoint.method, url, headers, body);
            const fetchEnd = Date.now();

            metrics.timeToFirstByte = fetchEnd - fetchStart;
            metrics.endTime = fetchEnd;
            metrics.duration = fetchEnd - metrics.startTime;

            // Parse response
            const data = await this.parseResponse<T>(response);

            // Create result
            const result: ApiCallResult<T> = {
                context,
                data,
                statusCode: response.status,
                headers: this.extractHeaders(response),
                metrics,
                success: response.ok,
            };

            // Notify observer of completion
            this.metricsObserver.onCallComplete(result);
            this.metricsStream.emit(result);

            return result;
        } catch (error) {
            metrics.endTime = Date.now();
            metrics.duration = metrics.endTime - metrics.startTime;

            // Notify observer of error
            this.metricsObserver.onCallError(context, error as Error, metrics);
            this.metricsStream.emitError(context, error as Error);

            // Create error result
            const result: ApiCallResult<T> = {
                context,
                data: null as any,
                statusCode: 0,
                headers: {},
                metrics,
                success: false,
                error: error as Error,
            };

            throw error;
        }
    }

    /**
     * Rate limiting throttle
     */
    private async throttle(endpoint: ApiEndpoint): Promise<number> {
        const now = Date.now();
        const rateLimit = this.config.rateLimit || 1000;

        // Calculate cost-based delay
        const cost = typeof endpoint.cost === 'number' ? endpoint.cost : 1;
        const minDelay = rateLimit * cost;

        const elapsed = now - this.lastRequestTime;
        if (elapsed < minDelay) {
            const delay = minDelay - elapsed;
            await this.sleep(delay);
            this.lastRequestTime = Date.now();
            return delay;
        }

        this.lastRequestTime = now;
        return 0;
    }

    /**
     * Build full URL for request
     */
    private buildUrl(endpoint: ApiEndpoint, params: Record<string, any>): string {
        const baseUrl = this.config.baseUrl.replace(/\/$/, '');
        let path = endpoint.fullPath;

        // For GET requests, append query parameters
        if (endpoint.method === 'GET' && Object.keys(params).length > 0) {
            const query = new URLSearchParams();
            for (const [key, value] of Object.entries(params)) {
                if (value !== undefined && value !== null) {
                    query.append(key, String(value));
                }
            }
            path += `?${query.toString()}`;
        }

        return `${baseUrl}/${path}`;
    }

    /**
     * Build request headers
     */
    private buildHeaders(
        endpoint: ApiEndpoint,
        customHeaders: Record<string, string>
    ): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'User-Agent': 'UniversalApiClient/1.0',
            ...this.config.headers,
            ...customHeaders,
        };

        // Add authentication headers if required
        if (endpoint.requiresAuth && this.config.apiKey) {
            headers['X-API-KEY'] = this.config.apiKey;
            // Note: Actual auth implementation depends on exchange-specific requirements
            // This is a generic example
        }

        return headers;
    }

    /**
     * Build request body
     */
    private buildBody(endpoint: ApiEndpoint, params: Record<string, any>): string | undefined {
        if (endpoint.method === 'GET' || endpoint.method === 'HEAD') {
            return undefined;
        }

        if (Object.keys(params).length === 0) {
            return undefined;
        }

        return JSON.stringify(params);
    }

    /**
     * Execute HTTP fetch
     */
    private async fetch(
        method: HttpMethod,
        url: string,
        headers: Record<string, string>,
        body?: string
    ): Promise<Response> {
        const options: RequestInit = {
            method,
            headers,
            body,
        };

        // Add timeout if configured
        if (this.config.timeout) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
            options.signal = controller.signal;

            try {
                const response = await fetch(url, options);
                clearTimeout(timeoutId);
                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        }

        return fetch(url, options);
    }

    /**
     * Parse response data
     */
    private async parseResponse<T>(response: Response): Promise<T> {
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            return response.json();
        }

        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch {
            return text as any;
        }
    }

    /**
     * Extract headers from response
     */
    private extractHeaders(response: Response): Record<string, string> {
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });
        return headers;
    }

    /**
     * Generate unique call ID
     */
    private generateCallId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Dynamically generate endpoint methods
     * Creates a method for each endpoint: client.methodName(params)
     */
    private generateEndpointMethods(): void {
        for (const [methodName, endpoint] of this.endpoints) {
            // Create a bound method on the client instance
            (this as any)[methodName] = async (params: Record<string, any> = {}) => {
                return this.call(methodName, params);
            };
        }
    }
}

/**
 * Builder for creating UniversalApiClient instances
 */
export class ApiClientBuilder {
    private endpoints: ApiEndpoint[] = [];
    private config: Partial<ApiClientConfig> = {};

    /**
     * Set endpoints
     */
    withEndpoints(endpoints: ApiEndpoint[]): this {
        this.endpoints = endpoints;
        return this;
    }

    /**
     * Set base URL
     */
    withBaseUrl(baseUrl: string): this {
        this.config.baseUrl = baseUrl;
        return this;
    }

    /**
     * Set API credentials
     */
    withCredentials(apiKey: string, secret?: string): this {
        this.config.apiKey = apiKey;
        this.config.secret = secret;
        return this;
    }

    /**
     * Enable rate limiting
     */
    withRateLimit(rateLimit: number): this {
        this.config.enableRateLimit = true;
        this.config.rateLimit = rateLimit;
        return this;
    }

    /**
     * Set request timeout
     */
    withTimeout(timeout: number): this {
        this.config.timeout = timeout;
        return this;
    }

    /**
     * Set custom headers
     */
    withHeaders(headers: Record<string, string>): this {
        this.config.headers = headers;
        return this;
    }

    /**
     * Set metrics observer
     */
    withMetricsObserver(observer: MetricsObserver): this {
        this.config.metricsObserver = observer;
        return this;
    }

    /**
     * Enable detailed metrics
     */
    withDetailedMetrics(enabled: boolean = true): this {
        this.config.enableDetailedMetrics = enabled;
        return this;
    }

    /**
     * Build the API client
     */
    build(): UniversalApiClient {
        if (!this.config.baseUrl) {
            throw new Error('Base URL is required');
        }

        const fullConfig: ApiClientConfig = {
            baseUrl: this.config.baseUrl,
            apiKey: this.config.apiKey,
            secret: this.config.secret,
            authParams: this.config.authParams,
            enableRateLimit: this.config.enableRateLimit ?? true,
            rateLimit: this.config.rateLimit ?? 1000,
            timeout: this.config.timeout ?? 30000,
            headers: this.config.headers ?? {},
            metricsObserver: this.config.metricsObserver,
            enableDetailedMetrics: this.config.enableDetailedMetrics ?? true,
        };

        return new UniversalApiClient(this.endpoints, fullConfig);
    }
}
