# Universal API Client Module

Extract exchange APIs into a universal API client with comprehensive latency metrics observability.

## Features

- **Pure Interface**: One method for one API endpoint - no abstraction layers
- **No Non-Essential Calls**: Direct endpoint access without middleware overhead
- **Plug and Play**: Standalone module that works in any project
- **Latency Metrics Observability**: Comprehensive metrics tracking with percentiles
- **Rate Limiting**: Cost-based throttling with configurable limits
- **Real-time Metrics**: Stream API call results for dashboards
- **OpenAPI Generation**: Export API definitions as OpenAPI specs
- **Type Safety**: Full TypeScript support with interfaces

## Installation

The module is part of the CCXT library and can be used directly:

```typescript
import { CcxtApiAdapter, ApiExtractor } from 'ccxt/api-client';
```

Or as a standalone module by copying the `api-client` folder to your project.

## Quick Start

### Basic Usage

```typescript
import ccxt from 'ccxt';
import { CcxtApiAdapter } from 'ccxt/api-client';

// Create exchange instance
const exchange = new ccxt.binance({
  apiKey: 'your-api-key',
  secret: 'your-secret',
});

// Extract and create API client
const apiClient = CcxtApiAdapter.createClient(exchange);

// Call an endpoint
const result = await apiClient.call('sapiGetSystemStatus');

console.log('Response:', result.data);
console.log('Latency:', result.metrics.duration, 'ms');
console.log('Status:', result.statusCode);
```

### Using Dynamic Methods

The client automatically generates methods for each endpoint:

```typescript
// Each endpoint becomes a callable method
const result = await apiClient.sapiGetSystemStatus();

// With parameters
const orderResult = await apiClient.sapiPostOrder({
  symbol: 'BTCUSDT',
  side: 'BUY',
  type: 'LIMIT',
  quantity: 0.001,
  price: 50000,
});
```

## API Extraction

### Extract API Definition

```typescript
import { ApiExtractor } from 'ccxt/api-client';

const exchange = new ccxt.binance();
const apiDef = ApiExtractor.extractApi(exchange);

console.log('Exchange:', apiDef.name);
console.log('Total Endpoints:', apiDef.endpoints.length);
console.log('Rate Limit:', apiDef.rateLimit, 'ms');
```

### Filter Endpoints

```typescript
// Get only public endpoints
const publicEndpoints = ApiExtractor.filterByAuth(apiDef.endpoints, false);

// Get only GET endpoints
const getEndpoints = ApiExtractor.filterByMethod(apiDef.endpoints, 'GET');

// Get endpoints by namespace
const sapiEndpoints = ApiExtractor.filterByNamespace(apiDef.endpoints, 'sapi');

// Search by path pattern
const orderEndpoints = ApiExtractor.searchByPath(apiDef.endpoints, /order/i);
```

### Group Endpoints

```typescript
// Group by namespace
const byNamespace = ApiExtractor.groupByNamespace(apiDef.endpoints);
for (const [namespace, endpoints] of byNamespace) {
  console.log(`${namespace}: ${endpoints.length} endpoints`);
}

// Group by HTTP method
const byMethod = ApiExtractor.groupByMethod(apiDef.endpoints);
```

## Latency Metrics Observability

### Basic Metrics

```typescript
// Make some API calls
await apiClient.call('sapiGetSystemStatus');
await apiClient.call('sapiGetAccountInfo');

// Get metrics for specific endpoint
const metrics = apiClient.getEndpointMetrics('sapi/system/status');

console.log('Total Calls:', metrics.totalCalls);
console.log('Success Rate:', (metrics.successfulCalls / metrics.totalCalls) * 100, '%');
console.log('Average Latency:', metrics.averageLatency, 'ms');
console.log('Min Latency:', metrics.minLatency, 'ms');
console.log('Max Latency:', metrics.maxLatency, 'ms');
console.log('P50 (Median):', metrics.p50Latency, 'ms');
console.log('P95:', metrics.p95Latency, 'ms');
console.log('P99:', metrics.p99Latency, 'ms');
console.log('Total Rate Limit Delay:', metrics.totalRateLimitDelay, 'ms');
```

### Get All Metrics

```typescript
const allMetrics = apiClient.getAllMetrics();

for (const [endpoint, metrics] of allMetrics) {
  console.log(`${endpoint}:`);
  console.log(`  Calls: ${metrics.totalCalls}`);
  console.log(`  Avg Latency: ${metrics.averageLatency.toFixed(2)}ms`);
  console.log(`  P95: ${metrics.p95Latency.toFixed(2)}ms`);
}
```

### Custom Metrics Collector

```typescript
import { MetricsCollector, ApiClientBuilder, ApiExtractor } from 'ccxt/api-client';

// Create custom metrics collector
const metricsCollector = new MetricsCollector(5000); // Keep 5000 samples

// Extract endpoints
const apiDef = ApiExtractor.extractApi(exchange);

// Build client with custom collector
const apiClient = new ApiClientBuilder()
  .withEndpoints(apiDef.endpoints)
  .withBaseUrl('https://api.binance.com')
  .withMetricsObserver(metricsCollector)
  .build();

// After making calls, export metrics
const metricsJson = metricsCollector.exportMetrics();
console.log(JSON.stringify(metricsJson, null, 2));

// Get summary
const summary = metricsCollector.getSummary();
console.log('Total API Calls:', summary.totalCalls);
console.log('Overall Avg Latency:', summary.averageLatency, 'ms');
```

## Real-Time Metrics Streaming

```typescript
// Subscribe to real-time metrics
const unsubscribe = apiClient.subscribeMetrics((result) => {
  console.log('API Call:', result.context.endpoint.methodName);
  console.log('Duration:', result.metrics.duration, 'ms');
  console.log('Success:', result.success);

  if (result.metrics.rateLimitDelay) {
    console.log('Rate Limited:', result.metrics.rateLimitDelay, 'ms');
  }
});

// Make calls - metrics will be streamed
await apiClient.call('sapiGetSystemStatus');
await apiClient.call('sapiGetAccountInfo');

// Cleanup
unsubscribe();
```

## Advanced Usage

### Custom Metrics Observer

```typescript
import { MetricsObserver, ApiCallContext, ApiCallResult } from 'ccxt/api-client';

class CustomMetricsObserver implements MetricsObserver {
  onCallStart(context: ApiCallContext): void {
    console.log('Starting:', context.endpoint.methodName);
  }

  onCallComplete(result: ApiCallResult): void {
    console.log('Completed:', result.context.endpoint.methodName);
    console.log('Latency:', result.metrics.duration, 'ms');

    // Send to monitoring service
    this.sendToMonitoring(result);
  }

  onCallError(context: ApiCallContext, error: Error): void {
    console.error('Error:', context.endpoint.methodName, error.message);
  }

  getEndpointMetrics(endpoint: string) {
    return undefined;
  }

  getAllMetrics() {
    return new Map();
  }

  reset() {
    // Reset logic
  }

  private sendToMonitoring(result: ApiCallResult) {
    // Integration with Prometheus, DataDog, etc.
  }
}

// Use custom observer
const client = new ApiClientBuilder()
  .withEndpoints(endpoints)
  .withBaseUrl(baseUrl)
  .withMetricsObserver(new CustomMetricsObserver())
  .build();
```

### Raw HTTP Requests

```typescript
// Make raw requests without pre-defined endpoints
const result = await apiClient.request(
  'GET',
  'v3/ticker/price',
  { symbol: 'BTCUSDT' }
);

console.log('Price:', result.data);
```

### Rate Limiting Configuration

```typescript
const apiClient = new ApiClientBuilder()
  .withEndpoints(endpoints)
  .withBaseUrl(baseUrl)
  .withRateLimit(1000) // 1 request per second base rate
  .build();

// The client will automatically throttle based on endpoint costs
// High-cost endpoints will have longer delays
```

### Separate Public/Private Clients

```typescript
// Create client with only public endpoints (no auth needed)
const publicClient = CcxtApiAdapter.createPublicClient(exchange);

// Create client with only private endpoints (auth required)
const privateClient = CcxtApiAdapter.createPrivateClient(exchange);

// Use different clients for different purposes
const ticker = await publicClient.call('publicGetTicker');
const balance = await privateClient.call('privateGetBalance');
```

### Namespaced Clients

Some exchanges have different base URLs for different API namespaces:

```typescript
// Create separate clients for each namespace
const clients = CcxtApiAdapter.createNamespacedClients(exchange);

// Use specific client for each namespace
const sapiClient = clients.get('sapi');
const fapiClient = clients.get('fapi'); // Futures API

const status = await sapiClient.call('sapiGetSystemStatus');
const position = await fapiClient.call('fapiGetPosition');
```

## Documentation Generation

### Markdown Documentation

```typescript
const docs = CcxtApiAdapter.generateDocs(exchange);
console.log(docs);

// Output:
// # Binance API Reference
//
// Exchange ID: `binance`
// Rate Limit: 50ms
// Total Endpoints: 400+
//
// ## sapi
// ### GET
// | Method Name | Path | Cost | Auth |
// |-------------|------|------|------|
// | `sapiGetSystemStatus()` | system/status | 1 | 🔓 |
// ...
```

### OpenAPI Specification

```typescript
const openApiSpec = CcxtApiAdapter.generateOpenApiSpec(exchange);

// Save to file
fs.writeFileSync('binance-openapi.json', JSON.stringify(openApiSpec, null, 2));

// Use with Swagger UI, Postman, etc.
```

### JSON Export

```typescript
const json = CcxtApiAdapter.exportToJson(exchange);
fs.writeFileSync('binance-api.json', json);
```

## Standalone Usage (Without CCXT)

The API client can be used independently of CCXT:

```typescript
import { UniversalApiClient, ApiClientBuilder, ApiEndpoint } from './api-client';

// Define endpoints manually
const endpoints: ApiEndpoint[] = [
  {
    namespace: 'api',
    method: 'GET',
    path: 'v1/status',
    cost: 1,
    methodName: 'apiGetV1Status',
    fullPath: 'api/v1/status',
    requiresAuth: false,
  },
  {
    namespace: 'api',
    method: 'POST',
    path: 'v1/order',
    cost: 5,
    methodName: 'apiPostV1Order',
    fullPath: 'api/v1/order',
    requiresAuth: true,
  },
];

// Build client
const client = new ApiClientBuilder()
  .withEndpoints(endpoints)
  .withBaseUrl('https://api.example.com')
  .withCredentials('api-key', 'secret')
  .withRateLimit(1000)
  .withTimeout(30000)
  .build();

// Use it
const result = await client.call('apiGetV1Status');
```

## Architecture

### Components

1. **Types** (`types.ts`): TypeScript interfaces for all data structures
2. **MetricsCollector** (`MetricsCollector.ts`): Latency metrics tracking and aggregation
3. **ApiExtractor** (`ApiExtractor.ts`): Extract endpoint definitions from CCXT exchanges
4. **UniversalApiClient** (`UniversalApiClient.ts`): Core API client with observability
5. **CcxtApiAdapter** (`CcxtApiAdapter.ts`): Integration layer with CCXT

### Data Flow

```
Exchange Instance
       ↓
   ApiExtractor
       ↓
  API Definition
       ↓
 ApiClientBuilder
       ↓
UniversalApiClient
       ↓
  HTTP Request → Response
       ↓
MetricsCollector
       ↓
  Aggregated Metrics
```

## Performance Considerations

- **Minimal Overhead**: Direct endpoint calls without abstraction layers
- **Efficient Metrics**: Percentile calculations use bounded history (configurable)
- **Rate Limiting**: Cost-based throttling prevents API bans
- **Memory Management**: Configurable history size for metrics

## Integration Examples

### Prometheus Metrics Export

```typescript
import { MetricsCollector } from 'ccxt/api-client';

const collector = new MetricsCollector();
const client = CcxtApiAdapter.createClient(exchange, {
  metricsCollector: collector,
});

// Export Prometheus metrics
function exportPrometheusMetrics() {
  const metrics = collector.getAllMetrics();
  const lines: string[] = [];

  for (const [endpoint, m] of metrics) {
    const labels = `{endpoint="${endpoint}"}`;
    lines.push(`api_calls_total${labels} ${m.totalCalls}`);
    lines.push(`api_latency_avg_ms${labels} ${m.averageLatency}`);
    lines.push(`api_latency_p95_ms${labels} ${m.p95Latency}`);
    lines.push(`api_latency_p99_ms${labels} ${m.p99Latency}`);
  }

  return lines.join('\n');
}
```

### Dashboard Integration

```typescript
import { MetricsStream } from 'ccxt/api-client';

const stream = new MetricsStream();

// Subscribe for real-time dashboard updates
stream.subscribe((result) => {
  // Send to websocket, Server-Sent Events, etc.
  dashboard.emit('api-call', {
    endpoint: result.context.endpoint.methodName,
    duration: result.metrics.duration,
    timestamp: result.context.timestamp,
    success: result.success,
  });
});
```

## Testing

```typescript
import { UniversalApiClient, ApiClientBuilder } from 'ccxt/api-client';

// Create mock client for testing
const mockEndpoints = [/* test endpoints */];
const testClient = new ApiClientBuilder()
  .withEndpoints(mockEndpoints)
  .withBaseUrl('http://localhost:3000')
  .withRateLimit(0) // Disable rate limiting in tests
  .build();

// Test with metrics
const result = await testClient.call('testEndpoint');
expect(result.success).toBe(true);
expect(result.metrics.duration).toBeGreaterThan(0);
```

## Best Practices

1. **Reuse Clients**: Create one client per exchange and reuse it
2. **Monitor Metrics**: Regularly check P95/P99 latencies for performance degradation
3. **Rate Limiting**: Always enable rate limiting in production
4. **Error Handling**: Check `result.success` before using data
5. **Credentials**: Never hardcode API keys, use environment variables
6. **Metrics Export**: Periodically export metrics to avoid memory growth

## Troubleshooting

### Rate Limiting Issues

```typescript
// If you're getting rate limited, increase the rate limit
const client = CcxtApiAdapter.createClient(exchange, {
  enableRateLimit: true,
  // Custom rate limit (default uses exchange's rateLimit)
});

// Check rate limit delays in metrics
const metrics = client.getEndpointMetrics('sapi/order');
console.log('Total rate limit delay:', metrics.totalRateLimitDelay, 'ms');
```

### High Latency

```typescript
// Check P95/P99 to identify outliers
const metrics = client.getAllMetrics();
for (const [endpoint, m] of metrics) {
  if (m.p99Latency > 5000) { // 5 seconds
    console.warn(`High P99 latency on ${endpoint}: ${m.p99Latency}ms`);
  }
}
```

### Memory Usage

```typescript
// Limit metrics history size
const collector = new MetricsCollector(1000); // Keep only 1000 samples per endpoint

// Periodically reset metrics
setInterval(() => {
  collector.reset();
}, 3600000); // Reset every hour
```

## License

MIT License - same as CCXT

## Contributing

Contributions welcome! Please open an issue or PR on the CCXT repository.
