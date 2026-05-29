import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: [
      "tests/legacy/**",
      "tests/integration-server/**",
      "**/node_modules/**",
    ],
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      all: true,
      include: ["src/**/*.ts"],
    },
  },
});
