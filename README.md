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
pnpm install
```

Generate Connect RPC code:

```bash
pnpm run generate:rpc
```

Start the frontend dev server:

```bash
pnpm dev
```

Start the frontend and Go gateway concurrently:

```bash
pnpm dev:full
```

The frontend always uses the current page origin for Connect RPC. During Vite
development, `vite.config.ts` proxies the generated Connect RPC paths to the Go
gateway on `localhost:8080`.

Start the Go gateway:

```bash
make dev-backend
```

Run the Go gateway with Air hot reload for debugging:

```bash
make debug
```

Create a release build. This builds the frontend, copies it into the backend
embed directory, and builds a single gateway binary:

```bash
make release
```

The release binary is written to `bin/sliver-gateway` and serves the embedded
frontend by default. Use `-static /path/to/dist` only when you want to override
the embedded frontend with files from disk.

Run all checks:

```bash
pnpm check
```

The Makefile equivalents are:

```bash
make check
make build
make release
make clean
```

## Connect RPC generation

The gateway does not define a handwritten REST API. Sliver RPC bindings are
generated directly from the original Sliver protobuf definitions plus the small
gateway session protobuf definition.

```bash
pnpm generate:rpc
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
SLIVER_CONFIG_PATH=/path/to/sliver.cfg pnpm dev:backend
```

Useful options:

```bash
cd backend
go run ./cmd/sliver-gateway -addr :8080 -config /path/to/sliver.cfg -static ../dist
```
