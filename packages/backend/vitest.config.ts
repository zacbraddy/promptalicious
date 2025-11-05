import path from "path";
import { fileURLToPath } from "url";

import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    passWithNoTests: true,
    projects: [
      {
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./src"),
          },
        },
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts", "tests/contract/**/*.test.ts"],
          exclude: ["tests/integration/**/*.test.ts"],
        },
      },
      {
        resolve: {
          alias: {
            "@": path.resolve(__dirname, "./src"),
          },
        },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          globalSetup: ["./tests/setup/globalSetup.integration.ts"],
        },
      },
    ],
  },
});
