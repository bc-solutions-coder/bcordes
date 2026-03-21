# Error Handling & OTEL Observability Design

**Date:** 2026-03-19
**Scope:** BFF error handling, sanitized error responses, OpenTelemetry integration

## Context

Server functions currently swallow errors or return 200 with empty data when the Wallow API is unreachable. Error details (stack traces, missing env var messages) leak to the browser. There is no observability for the Node.js BFF — errors disappear silently.

The Wallow backend already exports telemetry via OTLP to a Grafana Alloy collector backed by the LGTM stack (Loki, Grafana, Tempo, Mimir). The frontend BFF should join that same observability pipeline.

## Goals

1. Server functions return proper HTTP status codes (500 for internal errors, not 200)
2. Error details are sanitized before reaching the browser — full details in dev, generic message + trace ID in prod
3. All BFF errors are recorded in OTEL traces, visible in Grafana alongside Wallow traces
4. Outbound HTTP calls to Wallow are traced

## Architecture

```
Browser (bcordes.dev)
  │  sees: { message: "Internal Server Error", traceId: "abc123" }
  ▼
TanStack Start / Nitro (bcordes)
  │  OTEL SDK records errors as span events
  │  sends traces/logs via OTLP HTTP/proto
  ▼
Grafana Alloy (OTLP collector, port 4318 HTTP)
  │  forwards to LGTM stack
  ▼
Grafana (Tempo for traces, Loki for logs)
  │  search by traceId, service name, error code
```

## OTEL SDK Setup

### Dependencies

```
@opentelemetry/api
@opentelemetry/sdk-node
@opentelemetry/exporter-trace-otlp-http
@opentelemetry/exporter-logs-otlp-http
@opentelemetry/auto-instrumentations-node
@opentelemetry/instrumentation-undici
```

Note: `exporter-*-otlp-http` (not gRPC) is used because the Alloy collector is Docker-internal over plaintext. HTTP/proto on port 4318 avoids gRPC credential configuration for unencrypted connections. Alloy accepts both protocols.

`@opentelemetry/instrumentation-undici` is explicitly included because Node.js native `fetch` is built on undici internally. Without this package, outbound `fetch` calls to Wallow would not be traced. The auto-instrumentations meta-package does not always include it.

### Initialization

Create `src/lib/telemetry.ts`:

```ts
import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici'

const sdk = new NodeSDK({
  serviceName: process.env.OTEL_SERVICE_NAME ?? 'bcordes',
  traceExporter: new OTLPTraceExporter(),
  logRecordExporter: new OTLPLogExporter(),
  instrumentations: [
    getNodeAutoInstrumentations(),
    new UndiciInstrumentation(),
  ],
})

sdk.start()

// Flush pending spans before process exit (important for Docker/Portainer deploys)
const shutdown = () => {
  sdk.shutdown().finally(() => process.exit(0))
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
```

**Initialization timing:** This file must execute before any other server code to ensure monkey-patching of `http`/`undici` works. Use Node.js `--import` flag in the start script:

```json
"start": "node --import ./src/lib/telemetry.ts .output/server/index.mjs"
```

If `--import` with `.ts` doesn't work in the built output, compile `telemetry.ts` to `.mjs` as part of the build and use:

```json
"start": "node --import ./.output/telemetry.mjs .output/server/index.mjs"
```

The Dockerfile CMD should match. A Nitro plugin is **not** suitable because plugins run after module imports, too late for monkey-patching.

### Environment Variables

```
OTEL_EXPORTER_OTLP_ENDPOINT=http://alloy:4318
OTEL_SERVICE_NAME=bcordes
```

Port 4318 is the HTTP/proto OTLP endpoint. Same env var pattern as the Wallow .NET service. Added to `.env.example` and `docker-compose.prod.yml`.

## Sanitized Error Utility

### `src/lib/errors.ts`

```ts
import { trace, SpanStatusCode } from '@opentelemetry/api'
import { isWallowError, type WallowError } from '@/lib/wallow/errors'

export interface SafeError {
  message: string
  traceId: string
  status: number
  validationErrors?: Record<string, string[]>
  details?: string
  stack?: string
}

export function createSafeError(err: unknown): SafeError {
  const span = trace.getActiveSpan()
  const traceId = span?.spanContext().traceId ?? ''

  // Record error on the active OTEL span
  if (span) {
    span.recordException(err instanceof Error ? err : new Error(String(err)))
    span.setStatus({ code: SpanStatusCode.ERROR })
  }

  const status = isWallowError(err) ? err.status : 500
  const isDev = process.env.NODE_ENV !== 'production'

  // Validation errors (400) pass through field errors in all environments
  // because the frontend needs them for form feedback
  if (isWallowError(err) && err.isValidation) {
    return {
      message: err.message,
      traceId,
      status: 400,
      validationErrors: err.validationErrors,
      ...(isDev && { stack: err.stack }),
    }
  }

  if (isDev) {
    return {
      message: err instanceof Error ? err.message : String(err),
      traceId,
      status,
      details: err instanceof Error ? err.message : undefined,
      stack: err instanceof Error ? err.stack : undefined,
    }
  }

  return {
    message: 'Internal Server Error',
    traceId,
    status,
  }
}
```

The `traceId` in the response lets anyone (dev, support, user report) map a browser error to the full trace in Grafana/Tempo.

## Error Handling Layers

### Layer 1: Wallow Clients (`client.ts`, `service-client.ts`)

Already throw `WallowError` with proper status codes. Changes:

1. **Remove `setResponseStatus` calls** from both clients. Status codes are set at Layer 2 (server functions), which is the canonical place. Clients may be called outside request context in the future.
2. **Add OTEL span recording** for all error paths (HTTP errors and connection failures):

```ts
import { trace, SpanStatusCode } from '@opentelemetry/api'

// On HTTP error:
const span = trace.getActiveSpan()
if (span) {
  span.recordException(new WallowError(problem))
  span.setStatus({ code: SpanStatusCode.ERROR })
}
throw new WallowError(problem)

// On connection failure (fetch throws):
catch (err) {
  const span = trace.getActiveSpan()
  if (span) {
    span.recordException(err instanceof Error ? err : new Error(String(err)))
    span.setStatus({ code: SpanStatusCode.ERROR })
  }
  throw err
}
```

### Layer 2: Server Functions (`src/server-fns/`)

The canonical error handling layer. Catches errors, records to OTEL, sets HTTP status, re-throws sanitized:

```ts
import { createSafeError } from '@/lib/errors'
import { setResponseStatus } from '@tanstack/react-start/server'

export const fetchShowcases = createServerFn({ method: 'GET' }).handler(
  async () => {
    try {
      const response = await serviceClient.get('/api/v1/showcases')
      return (await response.json()) as Showcase[]
    } catch (err) {
      const safe = createSafeError(err)
      setResponseStatus(safe.status)
      throw new Error(safe.message)
    }
  },
)
```

For server functions that need to pass validation errors to the frontend:

```ts
export const submitInquiry = createServerFn({ method: 'POST' })
  .inputValidator(submitInquirySchema)
  .handler(async ({ data }) => {
    try {
      // ...
    } catch (err) {
      const safe = createSafeError(err)
      setResponseStatus(safe.status)
      if (safe.validationErrors) {
        // Re-throw with validation details so the form can display field errors
        throw safe
      }
      throw new Error(safe.message)
    }
  })
```

### Layer 3: Route Loaders — Graceful Degradation

For pages that can render without API data (homepage, work gallery), keep try/catch but return empty data **and** set a 200 status. The page renders with missing content rather than showing an error screen. The error is still recorded in OTEL via Layer 2's `createSafeError`:

```ts
// src/routes/index.tsx
loader: async () => {
  try {
    const showcases = await fetchShowcases()
    return { showcases }
  } catch {
    // Error already recorded in OTEL by the server function
    return { showcases: [] }
  }
},
```

For pages that **require** data (e.g., `/work/:slug` detail page), let the error propagate to the error boundary.

**Trade-off:** The homepage degrades gracefully (shows hero, services, skills — just no featured work) rather than showing an error screen when Wallow is down. This is a deliberate resilience choice.

### Layer 4: Error Boundary

Add a root error boundary component that displays:
- **Dev:** Full error message, stack trace, trace ID
- **Prod:** "Something went wrong" with the trace ID (so users can report it)

This is a React component using TanStack Router's `ErrorComponent` pattern on `__root.tsx`.

## File Changes

### New Files

1. `src/lib/telemetry.ts` — OTEL SDK initialization with graceful shutdown
2. `src/lib/errors.ts` — `createSafeError` utility with validation pass-through
3. `src/components/shared/ErrorFallback.tsx` — Error boundary component

### Modified Files

4. `src/lib/wallow/client.ts` — Remove `setResponseStatus`, add OTEL span recording, add connection-failure error recording
5. `src/lib/wallow/service-client.ts` — Remove `setResponseStatus`, add OTEL span recording, add connection-failure error recording
6. `src/server-fns/showcases.ts` — Wrap with error handling (createSafeError + setResponseStatus)
7. `src/server-fns/inquiries.ts` — Wrap with error handling, pass validation errors through
8. `src/routes/index.tsx` — Keep try/catch for graceful degradation (already present)
9. `src/routes/work/index.tsx` — Keep try/catch for graceful degradation (already present)
10. `src/routes/__root.tsx` — Wire root error boundary (ErrorFallback)
11. `package.json` — Add OTEL dependencies, update `start` script with `--import`
12. `Dockerfile` — Update CMD to use `--import` for telemetry
13. `.env.example` — Add OTEL env vars
14. `docker-compose.prod.yml` — Add OTEL env vars to web service
15. `CLAUDE.md` — Document observability setup

## Environment Variables

**Add:**
- `OTEL_EXPORTER_OTLP_ENDPOINT` — Alloy collector endpoint (e.g., `http://alloy:4318`)
- `OTEL_SERVICE_NAME` — Service identifier (default: `bcordes`)

## What's Deliberately Excluded

- **Client-side error reporting** — browser errors are not sent to OTEL (would require a browser OTEL SDK or error reporting service). Out of scope.
- **Metrics** — OTEL metrics (request latency, error rates) could be added later. This design covers traces and logs only.
- **Alloy configuration changes** — Alloy already accepts OTLP on port 4318. No config changes needed unless filtering is desired.
- **Alerting** — Grafana alerting rules (e.g., "alert on 5xx spike") are a separate concern.
