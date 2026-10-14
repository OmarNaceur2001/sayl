import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
      // The real package throws outside a React Server Components bundler.
      "server-only": resolve(__dirname, "test/server-only.ts"),
    },
  },
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**"],
    environment: "node",
  },
});
