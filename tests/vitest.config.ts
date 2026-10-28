import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // plan §10: Vitest alias `@` → ../web
      "@": path.resolve(here, "../web"),
    },
  },
  test: {
    environment: "node",
    include: ["data/**/*.test.ts", "unit/**/*.test.ts", "api/**/*.test.ts"],
    // plan §10.1: memory driver for API tests; set before any module import.
    env: { STORAGE_DRIVER: "memory" },
    // Separate module graph per file so the memory store/rate limiter start fresh.
    isolate: true,
  },
  server: {
    fs: { allow: [path.resolve(here, "..")] },
  },
});
