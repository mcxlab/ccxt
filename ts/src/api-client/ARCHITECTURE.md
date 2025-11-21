# Universal API Client Architecture

## Overview

The Universal API Client Module is a standalone, plug-and-play system for extracting exchange APIs into a pure interface with comprehensive latency metrics observability.

## Design Principles

1. **Pure Interface**: One method for one API endpoint - no abstraction layers
2. **No Non-Essential Calls**: Direct endpoint access without middleware overhead
3. **Standalone**: Can be used independently of CCXT
4. **Observability First**: Comprehensive metrics tracking built-in
5. **Type Safe**: Full TypeScript support with interfaces
6. **Performance Focused**: Minimal overhead, efficient metrics collection

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Application                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CcxtApiAdapter                             │
│  - Creates clients from CCXT exchanges                          │
│  - Handles public/private client separation                     │
│  - Generates documentation and OpenAPI specs                    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         ▼                                  ▼
┌──────────────────┐            ┌──────────────────────┐
│  ApiExtractor    │            │ UniversalApiClient   │
│                  │            │                      │
│ - Extracts API   │            │ - HTTP client        │
│   definitions    │            │ - Rate limiting      │
│ - Filters        │            │ - Metrics tracking   │
│ - Groups         │            │ - Dynamic methods    │
│ - Searches       │            │ - Request/response   │
└──────────────────┘            └──────────┬───────────┘
                                           │
                          ┌────────────────┴────────────────┐
                          ▼                                  ▼
                 ┌──────────────────┐            ┌──────────────────┐
                 │ MetricsCollector │            │  MetricsStream   │
                 │                  │            │                  │
                 │ - Latency stats  │            │ - Real-time      │
                 │ - Percentiles    │            │   streaming      │
                 │ - Aggregation    │            │ - Subscriptions  │
                 │ - Export         │            │ - Callbacks      │
                 └──────────────────┘            └──────────────────┘
```

## Module Structure

```
api-client/
├── types.ts                    # Core TypeScript interfaces and types
├── MetricsCollector.ts         # Latency metrics tracking and aggregation
├── ApiExtractor.ts             # Extract API definitions from CCXT
├── UniversalApiClient.ts       # Core API client with observability
├── CcxtApiAdapter.ts           # Integration layer with CCXT
├── index.ts                    # Main exports
├── README.md                   # User documentation
├── ARCHITECTURE.md             # This file
├── package.json                # NPM package configuration
├── tsconfig.json               # TypeScript configuration
├── examples/                   # Usage examples
│   ├── basic-usage.ts
│   ├── metrics-observability.ts
│   ├── api-extraction.ts
│   ├── standalone-usage.ts
│   └── realtime-streaming.ts
└── test/
    └── extractor.test.ts       # Test suite
```

## Component Details

### 1. Types (`types.ts`)

Defines all interfaces and types used throughout the module:

- **ApiEndpoint**: Represents a single API endpoint
- **LatencyMetrics**: Detailed timing information for API calls
- **ApiCallContext**: Context information for tracking calls
- **ApiCallResult**: Complete result including data and metrics
- **EndpointMetrics**: Aggregated metrics for an endpoint
- **MetricsObserver**: Interface for custom metrics collection
- **IApiClient**: Core API client interface

### 2. MetricsCollector (`MetricsCollector.ts`)

Implements the MetricsObserver interface to collect and aggregate latency metrics:

**Features:**
- Tracks latency for each endpoint
- Calculates percentiles (P50, P95, P99)
- Maintains bounded history for memory efficiency
- Provides summary statistics
- Exports metrics as JSON

**Key Methods:**
- `onCallStart()`: Called when API call begins
- `onCallComplete()`: Called when API call succeeds
- `onCallError()`: Called when API call fails
- `getEndpointMetrics()`: Get metrics for specific endpoint
- `getAllMetrics()`: Get all collected metrics
- `getSummary()`: Get overall summary statistics

### 3. ApiExtractor (`ApiExtractor.ts`)

Extracts API endpoint definitions from CCXT Exchange instances:

**Features:**
- Parses CCXT API definitions
- Generates method names following CCXT conventions
- Determines authentication requirements
- Provides filtering and searching capabilities
- Generates documentation and OpenAPI specs

**Key Methods:**
- `extractApi()`: Extract complete API definition
- `extractEndpoints()`: Extract all endpoints
- `filterByNamespace()`: Filter by API namespace
- `filterByMethod()`: Filter by HTTP method
- `filterByAuth()`: Filter by auth requirement
- `searchByPath()`: Search endpoints by path pattern
- `generateOpenApiSpec()`: Generate OpenAPI specification
- `generateMarkdownDocs()`: Generate markdown documentation

### 4. UniversalApiClient (`UniversalApiClient.ts`)

Core HTTP client with built-in observability:

**Features:**
- Direct endpoint calling
- Dynamic method generation
- Rate limiting with cost-based throttling
- Automatic metrics collection
- Real-time metrics streaming
- Request/response handling
- Error handling

**Key Methods:**
- `call()`: Call endpoint by method name
- `request()`: Make raw HTTP request
- `getEndpoints()`: Get all available endpoints
- `getEndpoint()`: Get specific endpoint definition
- `getEndpointMetrics()`: Get metrics for endpoint
- `subscribeMetrics()`: Subscribe to real-time metrics

**Internal Flow:**
```
call(methodName, params)
  ↓
executeRequest()
  ↓
throttle() [if rate limiting enabled]
  ↓
buildUrl(), buildHeaders(), buildBody()
  ↓
fetch()
  ↓
parseResponse()
  ↓
metrics collected and observers notified
  ↓
return ApiCallResult
```

### 5. CcxtApiAdapter (`CcxtApiAdapter.ts`)

Integration layer between CCXT and UniversalApiClient:

**Features:**
- Creates clients from CCXT exchanges
- Handles credential configuration
- Separates public/private endpoints
- Creates namespace-specific clients
- Generates documentation

**Key Methods:**
- `createClient()`: Create client from exchange
- `createPublicClient()`: Create client with only public endpoints
- `createPrivateClient()`: Create client with only private endpoints
- `createNamespacedClients()`: Create separate clients per namespace
- `extractApiDefinition()`: Extract API definition
- `generateDocs()`: Generate documentation
- `generateOpenApiSpec()`: Generate OpenAPI spec

## Data Flow

### 1. Extraction Flow

```
CCXT Exchange Instance
  ↓
exchange.api (API definition object)
  ↓
ApiExtractor.extractApi()
  ↓
Iterate namespaces → methods → paths
  ↓
Create ApiEndpoint objects
  ↓
ExchangeApiDefinition
```

### 2. Call Flow

```
User calls: client.call('methodName', params)
  ↓
UniversalApiClient.call()
  ↓
Look up ApiEndpoint
  ↓
Create ApiCallContext
  ↓
Notify observer: onCallStart()
  ↓
Apply rate limiting (if enabled)
  ↓
Build URL, headers, body
  ↓
Execute fetch()
  ↓
Parse response
  ↓
Calculate metrics
  ↓
Notify observer: onCallComplete() or onCallError()
  ↓
Emit to metrics stream
  ↓
Return ApiCallResult
```

### 3. Metrics Flow

```
API Call
  ↓
Metrics captured during call
  ↓
MetricsCollector.onCallComplete()
  ↓
Update endpoint metrics:
  - Increment call counter
  - Update latency stats
  - Recalculate percentiles
  - Update history buffer
  ↓
Metrics available via:
  - getEndpointMetrics()
  - getAllMetrics()
  - getSummary()
  - exportMetrics()
```

## Key Design Decisions

### 1. Dynamic Method Generation

Each endpoint gets a callable method on the client instance:

```typescript
// Instead of:
client.call('sapiGetSystemStatus', {})

// You can use:
client.sapiGetSystemStatus()
```

This provides:
- Type safety (with proper TypeScript declarations)
- IDE autocomplete
- Natural API feel
- Backwards compatibility with call()

### 2. Cost-Based Rate Limiting

Rate limiting uses endpoint cost for accurate throttling:

```typescript
// Low-cost endpoint: 50ms delay
cost = 1, rateLimit = 50ms → delay = 50ms

// High-cost endpoint: 250ms delay
cost = 5, rateLimit = 50ms → delay = 250ms
```

This prevents API bans while maximizing throughput.

### 3. Bounded Metrics History

Metrics collector maintains bounded history (default 1000 samples):

- Prevents memory growth
- Enables accurate percentile calculations
- Configurable history size
- Automatic eviction of old samples

### 4. Observer Pattern for Metrics

Uses observer pattern for flexible metrics collection:

```typescript
interface MetricsObserver {
  onCallStart()
  onCallComplete()
  onCallError()
}
```

Benefits:
- Custom metrics implementations
- Integration with monitoring systems
- No coupling to specific metrics solution
- Real-time streaming capability

### 5. Standalone Design

Module can work independently of CCXT:

```typescript
// With CCXT
const client = CcxtApiAdapter.createClient(exchange);

// Without CCXT
const client = new ApiClientBuilder()
  .withEndpoints(customEndpoints)
  .withBaseUrl(url)
  .build();
```

## Performance Considerations

### 1. Minimal Overhead

- Direct fetch calls without middleware
- Efficient metrics calculation
- Lazy method generation
- No proxy objects

### 2. Memory Management

- Bounded metrics history
- Map-based endpoint indexing
- Efficient percentile calculation
- Optional metrics collection

### 3. Network Optimization

- Cost-based rate limiting
- Configurable timeouts
- Connection reuse (via fetch)
- Minimal headers

## Extension Points

### 1. Custom Metrics Observer

Implement `MetricsObserver` interface:

```typescript
class PrometheusObserver implements MetricsObserver {
  onCallComplete(result) {
    prometheus.histogram('api_latency', result.metrics.duration);
  }
}
```

### 2. Custom Request Signing

Extend `UniversalApiClient` and override `buildHeaders()`:

```typescript
class CustomApiClient extends UniversalApiClient {
  protected buildHeaders(endpoint, customHeaders) {
    const headers = super.buildHeaders(endpoint, customHeaders);
    // Add custom signing
    return headers;
  }
}
```

### 3. Custom Endpoint Filtering

Use `ApiExtractor` filtering methods:

```typescript
const filtered = ApiExtractor.searchByPath(endpoints, /custom/);
const client = new ApiClientBuilder()
  .withEndpoints(filtered)
  .build();
```

## Testing Strategy

### Unit Tests
- Test each component independently
- Mock dependencies
- Verify metrics calculations
- Test error handling

### Integration Tests
- Test with real CCXT exchanges
- Verify extraction accuracy
- Test actual API calls (with mocks)
- Verify metrics collection

### Performance Tests
- Measure overhead
- Verify memory usage
- Test rate limiting accuracy
- Measure percentile calculation performance

## Security Considerations

1. **Credentials**: Never log or expose API keys
2. **Rate Limiting**: Always enable in production
3. **Timeouts**: Set reasonable timeouts to prevent hangs
4. **Error Messages**: Don't expose sensitive information
5. **HTTPS**: Always use HTTPS for API calls

## Future Enhancements

1. **WebSocket Support**: Extend to WebSocket APIs
2. **Caching**: Add response caching layer
3. **Retry Logic**: Automatic retry with exponential backoff
4. **Circuit Breaker**: Fail fast when API is down
5. **Request Batching**: Batch multiple requests
6. **Mock Mode**: Built-in mocking for testing

## License

MIT License - Same as CCXT
