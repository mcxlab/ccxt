/**
 * Universal API Client Types
 *
 * Pure interface definitions for exchange API clients with latency observability
 */

/**
 * HTTP methods supported by the API client
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD';

/**
 * Latency metrics for a single API call
 */
export interface LatencyMetrics {
    /** Start timestamp in milliseconds */
    startTime: number;
    /** End timestamp in milliseconds */
    endTime: number;
    /** Total duration in milliseconds */
    duration: number;
    /** Time spent waiting for rate limit */
    rateLimitDelay?: number;
    /** Time spent on DNS lookup */
    dnsLookup?: number;
    /** Time spent establishing TCP connection */
    tcpConnection?: number;
    /** Time spent on TLS handshake */
    tlsHandshake?: number;
    /** Time to first byte */
    timeToFirstByte?: number;
    /** Time spent downloading response */
    downloadTime?: number;
}

/**
 * API endpoint definition extracted from exchange
 */
export interface ApiEndpoint {
    /** Namespace/category (e.g., 'sapi', 'private', 'public') */
    namespace: string;
    /** HTTP method */
    method: HttpMethod;
    /** Endpoint path (e.g., 'system/status') */
    path: string;
    /** Rate limit cost */
    cost: number | Record<string, any>;
    /** Generated method name in camelCase */
    methodName: string;
    /** Full path including namespace */
    fullPath: string;
    /** Whether authentication is required */
    requiresAuth: boolean;
}

/**
 * API call context for tracking and observability
 */
export interface ApiCallContext {
    /** Unique identifier for this call */
    callId: string;
    /** Endpoint being called */
    endpoint: ApiEndpoint;
    /** Request parameters */
    params: Record<string, any>;
    /** Custom headers */
    headers?: Record<string, string>;
    /** Timestamp when call was initiated */
    timestamp: number;
}

/**
 * API call result with metrics
 */
export interface ApiCallResult<T = any> {
    /** Call context */
    context: ApiCallContext;
    /** Response data */
    data: T;
    /** HTTP status code */
    statusCode: number;
    /** Response headers */
    headers: Record<string, string>;
    /** Latency metrics */
    metrics: LatencyMetrics;
    /** Whether call was successful */
    success: boolean;
    /** Error if call failed */
    error?: Error;
}

/**
 * Aggregated metrics for an endpoint
 */
export interface EndpointMetrics {
    /** Endpoint identifier */
    endpoint: string;
    /** Total number of calls */
    totalCalls: number;
    /** Number of successful calls */
    successfulCalls: number;
    /** Number of failed calls */
    failedCalls: number;
    /** Average latency in milliseconds */
    averageLatency: number;
    /** Minimum latency in milliseconds */
    minLatency: number;
    /** Maximum latency in milliseconds */
    maxLatency: number;
    /** 50th percentile latency (median) */
    p50Latency: number;
    /** 95th percentile latency */
    p95Latency: number;
    /** 99th percentile latency */
    p99Latency: number;
    /** Total rate limit delay time */
    totalRateLimitDelay: number;
    /** Last call timestamp */
    lastCallTime: number;
}

/**
 * Metrics observer interface for custom metric collection
 */
export interface MetricsObserver {
    /**
     * Called when an API call starts
     */
    onCallStart(context: ApiCallContext): void;

    /**
     * Called when an API call completes
     */
    onCallComplete(result: ApiCallResult): void;

    /**
     * Called when an API call fails
     */
    onCallError(context: ApiCallContext, error: Error, metrics: LatencyMetrics): void;

    /**
     * Get aggregated metrics for an endpoint
     */
    getEndpointMetrics(endpoint: string): EndpointMetrics | undefined;

    /**
     * Get all collected metrics
     */
    getAllMetrics(): Map<string, EndpointMetrics>;

    /**
     * Reset all metrics
     */
    reset(): void;
}

/**
 * Configuration for the API client
 */
export interface ApiClientConfig {
    /** Base URL for API requests */
    baseUrl: string;
    /** API key for authentication */
    apiKey?: string;
    /** API secret for authentication */
    secret?: string;
    /** Additional authentication parameters */
    authParams?: Record<string, any>;
    /** Enable rate limiting */
    enableRateLimit?: boolean;
    /** Base rate limit in milliseconds */
    rateLimit?: number;
    /** Request timeout in milliseconds */
    timeout?: number;
    /** Custom headers for all requests */
    headers?: Record<string, string>;
    /** Metrics observer */
    metricsObserver?: MetricsObserver;
    /** Enable detailed metrics collection */
    enableDetailedMetrics?: boolean;
}

/**
 * Universal API client interface
 */
export interface IApiClient {
    /**
     * Get the configuration
     */
    getConfig(): ApiClientConfig;

    /**
     * Get all available endpoints
     */
    getEndpoints(): ApiEndpoint[];

    /**
     * Get endpoint by method name
     */
    getEndpoint(methodName: string): ApiEndpoint | undefined;

    /**
     * Make an API call
     */
    call<T = any>(methodName: string, params?: Record<string, any>): Promise<ApiCallResult<T>>;

    /**
     * Make a raw HTTP request
     */
    request<T = any>(
        method: HttpMethod,
        path: string,
        params?: Record<string, any>,
        headers?: Record<string, string>
    ): Promise<ApiCallResult<T>>;

    /**
     * Get metrics observer
     */
    getMetricsObserver(): MetricsObserver | undefined;

    /**
     * Get aggregated metrics for an endpoint
     */
    getEndpointMetrics(endpoint: string): EndpointMetrics | undefined;

    /**
     * Get all metrics
     */
    getAllMetrics(): Map<string, EndpointMetrics>;
}

/**
 * Exchange API definition extracted from CCXT
 */
export interface ExchangeApiDefinition {
    /** Exchange ID */
    exchangeId: string;
    /** Exchange name */
    name: string;
    /** Base URLs */
    urls: {
        api?: string | Record<string, string>;
        www?: string;
        doc?: string | string[];
    };
    /** All extracted endpoints */
    endpoints: ApiEndpoint[];
    /** Rate limit configuration */
    rateLimit: number;
    /** Feature flags */
    has: Record<string, boolean | 'emulated'>;
}
