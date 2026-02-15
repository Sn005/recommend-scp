import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}", "e2e/lib/**/*.test.ts"],
    exclude: ["node_modules", ".next", "e2e/specs"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules", ".next", "src/test", "**/*.d.ts", "**/*.config.*"],
    },
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:3001",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
