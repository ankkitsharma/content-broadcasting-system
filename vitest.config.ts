import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./test/vitest.setup.ts"],
    restoreMocks: true,
    clearMocks: true,
    mockReset: true
  }
});

