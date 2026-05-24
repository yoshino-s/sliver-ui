# Sliver Web Client

A browser-based Sliver client built with a Go mTLS gateway plus a Vite, React,
and TypeScript frontend. It provides a web dashboard for common `sliver-client`
workflows:

- operator profile import
- mTLS gateway connection setup
- implant build/profile inventory and generation requests
- session and beacon overview
- common session commands
- listener creation
- job tracking
- loot browsing/content requests
- operator console commands

## Security model

The native Sliver client uses a token plus client certificates/private keys to
open an mTLS-backed RPC channel. A browser should not own that raw channel or
persist operator secrets. The browser sends the imported `sliver.cfg` to the Go
gateway, and the gateway owns the native Sliver mTLS gRPC connection in memory.

For production use, run the gateway only on a trusted host/network and add
deployment controls appropriate for your environment:

1. HTTPS in front of the gateway.
2. Strong user authentication and authorization.
3. Audit logging for operator actions.
4. Network allowlists and rate limits.

`sliver.cfg` is intentionally ignored by Git because it contains credentials and
private keys.

## Development

Install dependencies:

```bash
npm install
```

Generate the OpenAPI document and TypeScript API client:

```bash
npm run generate:api
```

Start the frontend dev server:

```bash
npm run dev
```

Start the Go gateway:

```bash
npm run dev:backend
```

Run a production-style build and serve the built UI from the gateway:

```bash
npm run dev:full
```

Create a production build:

```bash
npm run build
```

Run all checks:

```bash
npm run check
```

## API documentation and client generation

The Go API is defined with Huma route/input/output types. The gateway exposes
OpenAPI automatically at runtime, and the repository can also generate a static
spec:

```bash
npm run generate:openapi
```

The generated files are:

- `openapi/openapi.json`
- `src/api/schema.ts`

The frontend client wrapper lives in `src/api/client.ts` and uses
`openapi-fetch` with the generated `paths` type.

## Gateway configuration

The gateway can connect from the UI by pasting/importing `sliver.cfg`, or it can
load a config on startup:

```bash
SLIVER_CONFIG_PATH=/path/to/sliver.cfg npm run dev:backend
```

Useful options:

```bash
cd backend
go run ./cmd/sliver-gateway -addr :8080 -config /path/to/sliver.cfg -static ../dist
```
