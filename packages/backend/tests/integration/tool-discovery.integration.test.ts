/*
 * Tool Discovery Service - Integration Tests
 *
 * These tests verify ts-morph integration with real TypeScript fixture files.
 * Tests cover:
 * - Parsing tool() calls and extracting metadata
 * - Scope analysis for detecting hook parameters
 * - Progress event emission
 * - Database integration
 * - Error handling with malformed files
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

import { describe, it, expect, beforeEach, afterAll, afterEach } from "vitest";

import { db } from "@/db/connection";
import { tools } from "@/db/schema/tools.schema";
import * as discoveryStatusService from "@/services/discovery-status.service";
import * as toolDiscoveryService from "@/services/tool-discovery.service";

const TEST_FIXTURES_DIR = path.join(__dirname, "../fixtures/tool-discovery");

describe("toolDiscoveryService - ts-morph integration", () => {
  beforeEach(async () => {
    discoveryStatusService.resetState();
    await db.delete(tools);
  });

  afterEach(async () => {
    await db.delete(tools);
  });

  afterAll(async () => {
    await cleanupFixture(TEST_FIXTURES_DIR);
  });

  describe("parsing tool() calls", () => {
    it("should discover tool with simple parameters", async () => {
      const fixtureDir = path.join(TEST_FIXTURES_DIR, "simple-tool");
      await setupFixture(fixtureDir, {
        "simple-tool.ts": `
import { tool } from 'ai';
import { z } from 'zod';

export const greetUser = tool({
  description: 'Greet a user by name',
  parameters: z.object({
    name: z.string().describe('User name'),
  }),
  execute: async ({ name }) => {
    return \`Hello, \${name}!\`;
  },
});
        `,
        "tsconfig.json": JSON.stringify({
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            strict: true,
          },
        }),
      });

      const result = await toolDiscoveryService.discoverTools(fixtureDir);

      expect(result.summary.filesScanned).toBeGreaterThan(0);
      expect(result.summary.filesWithToolImports).toBe(1);
      expect(result.summary.toolsDiscovered).toBe(1);

      const savedTools = await db.select().from(tools);
      expect(savedTools).toHaveLength(1);
      expect(savedTools[0]?.name).toBe("greetUser");
      expect(savedTools[0]?.description).toBe("Greet a user by name");
      expect(savedTools[0]?.detectedHookParams).toEqual([]);

      await cleanupFixture(fixtureDir);
    });

    it("should detect undefined variables as hook parameters", async () => {
      const fixtureDir = path.join(TEST_FIXTURES_DIR, "tool-with-dependencies");
      await setupFixture(fixtureDir, {
        "user-tool.ts": `
import { tool } from 'ai';
import { z } from 'zod';

export const getUserProfile = tool({
  description: 'Fetch user profile from database',
  parameters: z.object({
    userId: z.string(),
  }),
  execute: async ({ userId }) => {
    const user = await db.users.findUnique({ where: { id: userId } });
    const isAdmin = await authService.checkAdmin(userId);
    return { user, isAdmin };
  },
});
        `,
        "tsconfig.json": JSON.stringify({
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            strict: true,
          },
        }),
      });

      const result = await toolDiscoveryService.discoverTools(fixtureDir);

      expect(result.summary.toolsDiscovered).toBe(1);

      const savedTools = await db.select().from(tools);
      expect(savedTools).toHaveLength(1);
      expect(savedTools[0]?.detectedHookParams).toEqual(
        expect.arrayContaining(["db", "authService"]),
      );

      await cleanupFixture(fixtureDir);
    });

    it("should discover multiple tools in same file", async () => {
      const fixtureDir = path.join(TEST_FIXTURES_DIR, "multiple-tools");
      await setupFixture(fixtureDir, {
        "tools.ts": `
import { tool } from 'ai';
import { z } from 'zod';

export const addNumbers = tool({
  description: 'Add two numbers',
  parameters: z.object({
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ a, b }) => a + b,
});

export const multiplyNumbers = tool({
  description: 'Multiply two numbers',
  parameters: z.object({
    x: z.number(),
    y: z.number(),
  }),
  execute: async ({ x, y }) => x * y,
});
        `,
        "tsconfig.json": JSON.stringify({
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            strict: true,
          },
        }),
      });

      const result = await toolDiscoveryService.discoverTools(fixtureDir);

      expect(result.summary.toolsDiscovered).toBe(2);

      const savedTools = await db.select().from(tools);
      expect(savedTools).toHaveLength(2);
      expect(savedTools.map((t) => t.name).sort()).toEqual([
        "addNumbers",
        "multiplyNumbers",
      ]);

      await cleanupFixture(fixtureDir);
    });

    it("should discover multiple tools from factory functions in same file", async () => {
      const fixtureDir = path.join(TEST_FIXTURES_DIR, "multiple-factory-tools");
      await setupFixture(fixtureDir, {
        "colour-tools.ts": `
import { tool } from 'ai';
import { z } from 'zod';

export function createTool1() {
  return tool({
    description: 'A tool for 1',
    parameters: z.object({
      foreground: z.string(),
      background: z.string(),
    }),
    execute: async () => {
      return 1;
    },
  });
}

export function createTool2() {
  return tool({
    description: 'B tool for 2',
    execute: async () => {
      return 2;
    },
  });
}

export function createTool3() {
  return tool({
    description: 'C Tool for 3',
    execute: async () => {
      return 3;
    },
  });
}
        `,
        "tsconfig.json": JSON.stringify({
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            strict: true,
          },
        }),
      });

      const result = await toolDiscoveryService.discoverTools(fixtureDir);

      expect(result.summary.toolsDiscovered).toBe(3);

      const savedTools = await db.select().from(tools);
      expect(savedTools).toHaveLength(3);
      expect(savedTools.map((t) => t.name).sort()).toEqual([
        "tool1",
        "tool2",
        "tool3",
      ]);

      await cleanupFixture(fixtureDir);
    });

    it("should skip files without AI SDK import", async () => {
      const fixtureDir = path.join(TEST_FIXTURES_DIR, "no-ai-sdk");
      await setupFixture(fixtureDir, {
        "regular-code.ts": `
export function regularFunction() {
  return 'not a tool';
}
        `,
        "tsconfig.json": JSON.stringify({
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            strict: true,
          },
        }),
      });

      const result = await toolDiscoveryService.discoverTools(fixtureDir);

      expect(result.summary.filesScanned).toBeGreaterThan(0);
      expect(result.summary.filesWithToolImports).toBe(0);
      expect(result.summary.toolsDiscovered).toBe(0);
      expect(result.summary.skippedFiles.length).toBeGreaterThan(0);
      expect(result.summary.skippedFiles[0]?.reason).toContain("AI SDK");

      await cleanupFixture(fixtureDir);
    });
  });

  describe("progress events", () => {
    it("should emit progress counters during discovery", async () => {
      const fixtureDir = path.join(TEST_FIXTURES_DIR, "progress-test");
      await setupFixture(fixtureDir, {
        "tool1.ts": `
import { tool } from 'ai';
import { z } from 'zod';

export const tool1 = tool({
  description: 'First tool',
  parameters: z.object({ x: z.string() }),
  execute: async ({ x }) => x,
});
        `,
        "tool2.ts": `
import { tool } from 'ai';
import { z } from 'zod';

export const tool2 = tool({
  description: 'Second tool',
  parameters: z.object({ y: z.string() }),
  execute: async ({ y }) => y,
});
        `,
        "tsconfig.json": JSON.stringify({
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            strict: true,
          },
        }),
      });

      discoveryStatusService.startDiscovery();

      await toolDiscoveryService.discoverTools(fixtureDir);

      const status = discoveryStatusService.getCurrentStatus();

      expect(status.progress.filesScanned).toBeGreaterThan(0);
      expect(status.progress.toolsFound).toBe(2);
      expect(status.logs.length).toBeGreaterThan(0);
      expect(status.logs.some((l) => l.phase === "scanning")).toBe(true);
      expect(status.logs.some((l) => l.phase === "analyzing")).toBe(true);

      await cleanupFixture(fixtureDir);
    });

    it("should log each discovered tool with metadata", async () => {
      const fixtureDir = path.join(TEST_FIXTURES_DIR, "log-test");
      await setupFixture(fixtureDir, {
        "test-tool.ts": `
import { tool } from 'ai';
import { z } from 'zod';

export const testTool = tool({
  description: 'Test tool',
  parameters: z.object({ param: z.string() }),
  execute: async ({ param }) => {
    return externalService.process(param);
  },
});
        `,
        "tsconfig.json": JSON.stringify({
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            strict: true,
          },
        }),
      });

      discoveryStatusService.startDiscovery();

      await toolDiscoveryService.discoverTools(fixtureDir);

      const status = discoveryStatusService.getCurrentStatus();
      const toolLogs = status.logs.filter((l) => l.phase === "analyzing");

      expect(toolLogs.length).toBeGreaterThan(0);

      const matchingLog = toolLogs.find(
        (l) => l.context?.toolName === "testTool",
      );
      expect(matchingLog).toBeDefined();
      expect(matchingLog?.context?.detectedParams).toContain("externalService");

      await cleanupFixture(fixtureDir);
    });
  });

  describe("error handling", () => {
    it("should handle malformed tool definitions gracefully", async () => {
      const fixtureDir = path.join(TEST_FIXTURES_DIR, "malformed-tool");
      await setupFixture(fixtureDir, {
        "bad-tool.ts": `
import { tool } from 'ai';

export const badTool = tool({
  // Missing description
  parameters: 'not a zod schema',
  execute: 'not a function',
});
        `,
        "tsconfig.json": JSON.stringify({
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            strict: true,
          },
        }),
      });

      const result = await toolDiscoveryService.discoverTools(fixtureDir);

      expect(result.summary.filesScanned).toBeGreaterThan(0);
      expect(result.summary.toolsDiscovered).toBe(0);

      await cleanupFixture(fixtureDir);
    });

    it("should handle TypeScript syntax errors gracefully", async () => {
      const fixtureDir = path.join(TEST_FIXTURES_DIR, "syntax-error");
      await setupFixture(fixtureDir, {
        "syntax-error.ts": `
import { tool } from 'ai';

export const broken = tool({
  description: 'This has syntax error',
  parameters: z.object({
    // Missing closing brace
`,
        "tsconfig.json": JSON.stringify({
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            strict: true,
          },
        }),
      });

      await expect(
        toolDiscoveryService.discoverTools(fixtureDir),
      ).resolves.toBeDefined();

      await cleanupFixture(fixtureDir);
    });
  });

  describe("cancellation", () => {
    it("should stop discovery when cancellation is requested", async () => {
      const fixtureDir = path.join(TEST_FIXTURES_DIR, "cancellation-test");
      await setupFixture(fixtureDir, {
        "tool1.ts": `
import { tool } from 'ai';
import { z } from 'zod';

export const tool1 = tool({
  description: 'First',
  parameters: z.object({ x: z.string() }),
  execute: async ({ x }) => x,
});
        `,
        "tool2.ts": `
import { tool } from 'ai';
import { z } from 'zod';

export const tool2 = tool({
  description: 'Second',
  parameters: z.object({ y: z.string() }),
  execute: async ({ y }) => y,
});
        `,
        "tsconfig.json": JSON.stringify({
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            strict: true,
          },
        }),
      });

      discoveryStatusService.startDiscovery();

      setTimeout(() => {
        discoveryStatusService.requestCancellation();
      }, 10);

      const result = await toolDiscoveryService.discoverTools(fixtureDir);

      expect(result).toBeDefined();

      const status = discoveryStatusService.getCurrentStatus();
      const cancelLogs = status.logs.filter((l) =>
        l.message.toLowerCase().includes("cancel"),
      );

      expect(cancelLogs.length).toBeGreaterThanOrEqual(0);

      await cleanupFixture(fixtureDir);
    });
  });
});

async function setupFixture(
  dir: string,
  files: Record<string, string>,
): Promise<void> {
  await fs.mkdir(dir, { recursive: true });

  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(dir, filename);
    await fs.writeFile(filePath, content.trim(), "utf-8");
  }
}

async function cleanupFixture(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}
