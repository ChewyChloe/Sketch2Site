import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Hosted API remains disabled unless server-side review, approval and durable quota gates pass.
  define: command === "build" ? { "import.meta.env.VITE_SITES_FRONTEND_ONLY": JSON.stringify("false") } : {},
  html: command === "serve" ? { cspNonce: "sketch2site-dev-only" } : {},
  build: { sourcemap: false },
  server: {
    host: "127.0.0.1",
    proxy: {
      "/api/generation": {
        target: "http://127.0.0.1:" + (process.env.SKETCH_API_PORT ?? "8787"),
        changeOrigin: true,
      },
      "/api/auth": {
        target: "http://127.0.0.1:" + (process.env.SKETCH_API_PORT ?? "8787"),
        changeOrigin: true,
      },
    },
    headers: {
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'nonce-sketch2site-dev-only' https://accounts.google.com/gsi/client; style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style; img-src 'self' data: blob:; connect-src 'self' ws: https://accounts.google.com/gsi/; frame-src https://accounts.google.com/gsi/ https://www.youtube-nocookie.com https://player.vimeo.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      // Google sign-in needs the page origin (not the path) to verify where its button runs.
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  },
}));
