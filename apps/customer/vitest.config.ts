import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Aliases mirror tsconfig.json — without them the tests cannot resolve
// @octopus/api-client, @ui/* or @i18n/index. tsconfig keeps JSX for Next ("preserve"),
// so render tests compile .tsx with the automatic runtime (no `import React` needed).
export default defineConfig({
  resolve: {
    alias: {
      "@octopus/api-client": fileURLToPath(new URL("../../packages/api-client/src/index.ts", import.meta.url)),
      "@i18n": fileURLToPath(new URL("../../packages/i18n/src", import.meta.url)),
      "@ui": fileURLToPath(new URL("../../packages/ui/src", import.meta.url)),
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  esbuild: { jsx: "automatic" },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
