import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ command }) => ({
  plugins: [react()],
  html: command === "serve" ? { cspNonce: "sketch2site-dev-only" } : {},
  build: { sourcemap: false },
  server: {
    host: "127.0.0.1",
    proxy: {
      "/api/generation": {
        target: "http://127.0.0.1:" + (process.env.SKETCH_API_PORT ?? "8787"),
        changeOrigin: true,
      },
    },
    headers: {
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'nonce-sketch2site-dev-only'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    },
  },
}));
