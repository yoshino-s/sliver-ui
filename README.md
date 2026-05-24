# Sliver Web Client

A browser-based Sliver client prototype built with Vite, React, and TypeScript.
It provides a web dashboard for the common `sliver-client` workflows:

- operator profile import
- gateway connection setup
- implant inventory
- session overview
- listener status
- job tracking
- loot browsing
- operator console placeholder

## Security model

The native Sliver client uses a token plus client certificates/private keys to
open an mTLS-backed RPC channel. A browser should not own that raw channel or
persist operator secrets. This UI parses an imported `sliver.cfg` in memory and
shows only derived metadata.

For live operations, add a trusted server-side gateway that:

1. Loads the Sliver operator profile on the server side.
2. Opens the native Sliver RPC connection.
3. Exposes a browser-safe HTTPS or WebSocket API to this UI.
4. Applies authentication, authorization, audit logging, and rate limits.

`sliver.cfg` is intentionally ignored by Git because it contains credentials and
private keys.

## Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

## Current scope

This first version is a front-end prototype. It is ready for the next integration
step: adding a server-side Sliver gateway and replacing prototype data with API
responses.
