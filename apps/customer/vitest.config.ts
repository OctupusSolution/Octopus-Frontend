import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Aliases mirror tsconfig.json — without them the tests cannot resolve
// @octopus/api-client or @i18n/index.
export default defineConfig({
  resolve: {
    alias: {
      "@octopus/api-client": fileURLToPath(new URL("../../packages/api-client/src/index.ts", import.meta.url)),
      "@i18n": fileURLToPath(new URL("../../packages/i18n/src", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
