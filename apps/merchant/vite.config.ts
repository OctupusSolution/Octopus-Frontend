import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Cross-package imports resolve straight to source (no build step needed
// for packages/* yet) — see the alias map below. Once packages are
// published/built for real, swap these for normal package resolution.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@ui": path.resolve(__dirname, "../../packages/ui/src"),
      "@i18n": path.resolve(__dirname, "../../packages/i18n/src"),
    },
  },
  server: {
    port: 5180,
    strictPort: true,
    // AdminApi has no CORS configured, so calls go through this dev proxy
    // instead of hitting http://localhost:8081 directly from the browser.
    // Frontend code should call fetch("/api/v1/...") and never the backend
    // origin directly. See ADMIN_API_URL in .env for the target.
    proxy: {
      "/api": {
        target: process.env.ADMIN_API_URL ?? "http://localhost:8081",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
