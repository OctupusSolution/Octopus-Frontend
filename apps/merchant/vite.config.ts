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
  },
});
