import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/gatewaypb.GatewaySessionService": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/rpcpb.SliverRPC": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
