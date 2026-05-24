# Sliver Web Client

A browser-based Sliver client built with a thin Go Connect RPC gateway plus a
Vite, React Router, Mantine, and TypeScript frontend. It provides a web
dashboard for common `sliver-client` workflows:

- operator profile import
- Connect RPC gateway session setup
- implant build/profile inventory and generation requests
- session and beacon overview
- common session commands
- listener creation
- job tracking
- loot browsing/content requests
- operator console commands

## Security model

The native Sliver client uses a token plus client certificates/private keys to
open an mTLS-backed gRPC channel. A browser should not own that raw channel or
persist operator secrets. The browser sends the imported `sliver.cfg` to the
gateway session service, and the gateway validates the config by opening the
native Sliver mTLS gRPC client and calling `GetVersion`.

After a session is created, the frontend calls generated Connect RPC clients for
the original Sliver protobuf service. The gateway forwards those generated
Connect requests to the session's Sliver gRPC client using the
`X-Sliver-Session-Id` header.

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

Generate Connect RPC code:

```bash
npm run generate:rpc
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

## Connect RPC generation

The gateway does not define a handwritten REST API. Sliver RPC bindings are
generated directly from the original Sliver protobuf definitions plus the small
gateway session protobuf definition.

```bash
npm run generate:rpc
```

The generated files are:

- `backend/internal/generated/connect/rpcpb/rpcpbconnect/services.connect.go`
- `backend/internal/generated/connect/gatewaypb/gatewaypbconnect/session.connect.go`
- `backend/internal/generated/gatewaypb/session.pb.go`
- `src/gen/**`

The frontend uses `@connectrpc/connect-web` and generated `SliverRPC` /
`GatewaySessionService` clients.

## Gateway configuration

The gateway can create sessions from the UI by pasting/importing `sliver.cfg`,
or it can create an initial session on startup:

```bash
SLIVER_CONFIG_PATH=/path/to/sliver.cfg npm run dev:backend
```

Useful options:

```bash
cd backend
go run ./cmd/sliver-gateway -addr :8080 -config /path/to/sliver.cfg -static ../dist
```
