/**
 * Universal API Client Module
 *
 * Extract exchange APIs into a universal API client with latency metrics observability
 *
 * Features:
 * - Pure interface: one method for one API endpoint
 * - No non-essential calls
 * - Standalone and plug-and-play
 * - Comprehensive latency metrics observability
 * - Rate limiting with cost-based throttling
 * - Real-time metrics streaming
 * - OpenAPI specification generation
 *
 * @example
 * ```typescript
 * import ccxt from 'ccxt';
 * import { CcxtApiAdapter } from './api-client';
 *
 * // Create exchange instance
 * const exchange = new ccxt.binance({
 *   apiKey: 'your-api-key',
 *   secret: 'your-secret',
 * });
 *
 * // Extract and create API client
 * const apiClient = CcxtApiAdapter.createClient(exchange);
 *
 * // Call endpoints with automatic metrics tracking
 * const result = await apiClient.call('sapiGetSystemStatus');
 * console.log('Latency:', result.metrics.duration, 'ms');
 *
 * // Get aggregated metrics
 * const metrics = apiClient.getEndpointMetrics('sapi/system/status');
 * console.log('Average latency:', metrics.averageLatency, 'ms');
 * console.log('P95 latency:', metrics.p95Latency, 'ms');
 * ```
 */

// Core types
export * from './types.js';

// Metrics collection
export { MetricsCollector, MetricsStream } from './MetricsCollector.js';

// API extraction
export { ApiExtractor } from './ApiExtractor.js';

// Universal API client
export { UniversalApiClient, ApiClientBuilder } from './UniversalApiClient.js';

// CCXT adapter
export { CcxtApiAdapter } from './CcxtApiAdapter.js';
