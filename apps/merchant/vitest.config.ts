import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Aliases mirror tsconfig.json — tests resolve @/, @ui/ and @i18n the same
// way the app does.
export default defineConfig({
  resolve: {
    alias: {
      "@i18n": fileURLToPath(new URL("../../packages/i18n/src", import.meta.url)),
      "@ui": fileURLToPath(new URL("../../packages/ui/src", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
