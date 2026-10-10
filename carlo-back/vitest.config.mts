import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Prisma's native engine/TLS fails in Windows worker threads. Separate processes retain the same strict TLS and SQL fixtures.
    pool: "forks",
    maxWorkers: 1,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/*.d.ts"],
    },
  },
});
