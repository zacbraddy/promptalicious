/*
 * Project Configuration and Tool Discovery - End-to-End Integration Tests
 *
 * These tests verify the complete discovery flow from project configuration
 * through workspace generation. Tests cover:
 * - PUT /api/project triggers async discovery
 * - Polling GET /api/project/discovery/status for progress
 * - Workspace directory structure generation
 * - Tools saved to database with correct metadata
 * - GET /api/tools returns discovered tools
 * - Cleanup after test completion
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type {
  UpdateProjectConfigurationSuccessResponse,
  DiscoveryStatus,
} from "@promptalicious/shared-infra";

import app from "@/app";
import { db } from "@/db/connection";
import { projectConfiguration, tools } from "@/db/schema";
import * as discoveryStatusService from "@/services/discovery-status.service";

const TEST_FIXTURES_DIR = path.join(__dirname, "../fixtures");
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const TEST_WORKSPACE_DIR = path.join(REPO_ROOT, "workspace");

describe("Project configuration and tool discovery - full flow (integration)", () => {
  beforeEach(async () => {
    discoveryStatusService.resetState();
    await db.delete(tools);
    await db.delete(projectConfiguration);
  });

  afterEach(async () => {
    await db.delete(tools);
    await db.delete(projectConfiguration);
  });

  it(
    "should complete full project discovery flow with real test project",
    { timeout: 30000 },
    async () => {
      const testProjectPath = path.join(TEST_FIXTURES_DIR, "complete-project");
      await setupTestProject(testProjectPath, {
        "src/tools/weather.ts": `
import { tool } from 'ai';
import { z } from 'zod';

export const getWeather = tool({
  description: 'Get current weather for a location',
  parameters: z.object({
    location: z.string().describe('City name or zip code'),
    units: z.enum(['celsius', 'fahrenheit']).optional(),
  }),
  execute: async ({ location, units }) => {
    const data = await weatherService.getCurrentWeather(location, units);
    return {
      location,
      temperature: data.temp,
      conditions: data.conditions,
    };
  },
});
      `,
        "src/tools/database.ts": `
import { tool } from 'ai';
import { z } from 'zod';

export const getUserProfile = tool({
  description: 'Fetch user profile from database',
  parameters: z.object({
    userId: z.string().describe('User ID to lookup'),
  }),
  execute: async ({ userId }) => {
    const user = await db.users.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error(\`User not found: \${userId}\`);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  },
});
      `,
        "tsconfig.json": JSON.stringify({
          compilerOptions: {
            target: "ES2020",
            module: "commonjs",
            strict: true,
            esModuleInterop: true,
          },
          include: ["src/**/*"],
        }),
      });

      // Step 1: PUT /api/project to configure project and start discovery
      const configResponse = await app.request("/api/project", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "complete-project",
          targetProjectPath: testProjectPath,
        }),
      });

      expect(configResponse.status).toBe(202); // Accepted

      const configData =
        (await configResponse.json()) as UpdateProjectConfigurationSuccessResponse;
      expect(configData).toHaveProperty("config");
      expect(configData).toHaveProperty("discoveryStarted", true);
      expect(configData.config.name).toBe("complete-project");
      expect(configData.config.targetProjectPath).toBe(testProjectPath);

      // Step 2: Poll GET /api/project/discovery/status until complete
      let discoveryComplete = false;
      let attempts = 0;
      const maxAttempts = 100; // 50 seconds maximum

      while (!discoveryComplete && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 500)); // Wait 500ms between polls

        const statusResponse = await app.request(
          "/api/project/discovery/status",
        );
        expect(statusResponse.status).toBe(200);

        const statusData = (await statusResponse.json()) as DiscoveryStatus;

        expect(statusData).toHaveProperty("isDiscovering");
        expect(statusData).toHaveProperty("phase");
        expect(statusData).toHaveProperty("progress");
        expect(statusData).toHaveProperty("logs");

        if (!statusData.isDiscovering && statusData.phase === "complete") {
          discoveryComplete = true;

          // Validate final result
          expect(statusData.result).toBeDefined();
          expect(statusData.result?.discoveredToolsCount).toBe(2);
          expect(statusData.result?.summary).toBeDefined();
          expect(statusData.result?.summary.toolsDiscovered).toBe(2);
          expect(
            statusData.result?.summary.filesWithToolImports,
          ).toBeGreaterThanOrEqual(2);
        }

        attempts++;
      }

      expect(discoveryComplete).toBe(true);

      if (attempts >= maxAttempts) {
        throw new Error("Discovery did not complete within timeout period");
      }

      // Step 3: Verify workspace directory created with correct structure
      const workspacePath = path.join(TEST_WORKSPACE_DIR, "complete-project");

      // Check workspace root exists
      const workspaceExists = await fs
        .access(workspacePath)
        .then(() => true)
        .catch(() => false);
      expect(workspaceExists).toBe(true);

      // Check tsconfig.json exists
      const tsconfigPath = path.join(workspacePath, "tsconfig.json");
      const tsconfigExists = await fs
        .access(tsconfigPath)
        .then(() => true)
        .catch(() => false);
      expect(tsconfigExists).toBe(true);

      // Verify tsconfig.json contains @rootalicious alias
      const tsconfigContent = await fs.readFile(tsconfigPath, "utf-8");
      const tsconfig = JSON.parse(tsconfigContent) as {
        compilerOptions?: {
          paths?: Record<string, string[]>;
        };
      };
      expect(tsconfig.compilerOptions?.paths).toHaveProperty("@rootalicious/*");

      // Check workspace-level environment files
      const workspaceEnvPath = path.join(workspacePath, "environment.ts");
      const workspaceEnvExists = await fs
        .access(workspaceEnvPath)
        .then(() => true)
        .catch(() => false);
      expect(workspaceEnvExists).toBe(true);

      // Check workspace-level hooks
      const workspaceBeforeAllPath = path.join(workspacePath, "beforeAll.ts");
      const workspaceBeforeAllExists = await fs
        .access(workspaceBeforeAllPath)
        .then(() => true)
        .catch(() => false);
      expect(workspaceBeforeAllExists).toBe(true);

      const workspaceAfterAllPath = path.join(workspacePath, "afterAll.ts");
      const workspaceAfterAllExists = await fs
        .access(workspaceAfterAllPath)
        .then(() => true)
        .catch(() => false);
      expect(workspaceAfterAllExists).toBe(true);

      // Check tool directories and files for both discovered tools
      const toolDirs = ["getWeather", "getUserProfile"];

      for (const toolName of toolDirs) {
        const toolDir = path.join(workspacePath, toolName);
        const toolDirExists = await fs
          .access(toolDir)
          .then(() => true)
          .catch(() => false);
        expect(toolDirExists).toBe(true);

        // Check tool.ts exists
        const toolFilePath = path.join(toolDir, "tool.ts");
        const toolFileExists = await fs
          .access(toolFilePath)
          .then(() => true)
          .catch(() => false);
        expect(toolFileExists).toBe(true);

        // Check tool.ts imports environment
        const toolFileContent = await fs.readFile(toolFilePath, "utf-8");
        expect(toolFileContent).toContain('import "./environment"');

        // Check environment.d.ts exists
        const envPath = path.join(toolDir, "environment.ts");
        const envExists = await fs
          .access(envPath)
          .then(() => true)
          .catch(() => false);
        expect(envExists).toBe(true);

        // Check hook files exist
        const hookFiles = [
          "beforeAll.ts",
          "beforeEach.ts",
          "afterEach.ts",
          "afterAll.ts",
        ];
        for (const hookFile of hookFiles) {
          const hookPath = path.join(toolDir, hookFile);
          const hookExists = await fs
            .access(hookPath)
            .then(() => true)
            .catch(() => false);
          expect(hookExists).toBe(true);
        }
      }

      // Step 4: Verify tools saved to database
      const savedTools = await db.select().from(tools);
      expect(savedTools).toHaveLength(2);

      const toolNames = savedTools.map((t) => t.name).sort();
      expect(toolNames).toEqual(["getUserProfile", "getWeather"]);

      // Verify tool metadata
      const weatherTool = savedTools.find((t) => t.name === "getWeather");
      expect(weatherTool).toBeDefined();
      expect(weatherTool?.description).toBe(
        "Get current weather for a location",
      );
      expect(weatherTool?.sourceDescription).toBe(
        "Get current weather for a location",
      );
      expect(weatherTool?.enabled).toBe(true);
      expect(weatherTool?.detectedHookParams).toContain("weatherService");
      expect(weatherTool?.sourceFilePath).toContain("src/tools/weather.ts");
      expect(weatherTool?.workspaceDir).toContain("workspace");
      expect(weatherTool?.workspaceDir).toContain("getWeather");

      const userTool = savedTools.find((t) => t.name === "getUserProfile");
      expect(userTool).toBeDefined();
      expect(userTool?.description).toBe("Fetch user profile from database");
      expect(userTool?.detectedHookParams).toContain("db");

      // Step 5: Verify GET /api/tools returns discovered tools
      const toolsResponse = await app.request("/api/tools");
      expect(toolsResponse.status).toBe(200);

      const toolsData = (await toolsResponse.json()) as {
        tools: Array<{
          id: string;
          name: string;
          description: string;
          sourceDescription: string | null;
          enabled: boolean;
          createdAt: string;
          updatedAt: string;
        }>;
      };
      expect(toolsData).toHaveProperty("tools");
      expect(toolsData.tools).toHaveLength(2);

      const returnedToolNames = toolsData.tools.map((t) => t.name).sort();
      expect(returnedToolNames).toEqual(["getUserProfile", "getWeather"]);

      // Verify tool details available via GET /api/tools/:id
      const weatherDetailResponse = await app.request("/api/tools/getWeather");
      expect(weatherDetailResponse.status).toBe(200);

      const weatherDetail = (await weatherDetailResponse.json()) as {
        tool: {
          id: string;
          name: string;
          description: string;
          sourceDescription: string | null;
          parametersSchema: unknown;
          sourceFilePath: string;
          workspaceDir: string;
          enabled: boolean;
          detectedHookParams: string[];
          createdAt: string;
          updatedAt: string;
        };
      };
      expect(weatherDetail.tool.name).toBe("getWeather");
      expect(weatherDetail.tool.parametersSchema).toBeDefined();
      expect(weatherDetail.tool.detectedHookParams).toContain("weatherService");

      // Step 6: Cleanup handled in afterEach hook
      await cleanupTestProject(testProjectPath);
      await cleanupTestProject(workspacePath);
    },
  );

  it("should verify user's project remains untouched after discovery", async () => {
    const testProjectPath = path.join(TEST_FIXTURES_DIR, "untouched-project");
    await setupTestProject(testProjectPath, {
      "src/tools/simple-tool.ts": `
import { tool } from 'ai';
import { z } from 'zod';

export const simpleTool = tool({
  description: 'A simple tool',
  parameters: z.object({
    input: z.string(),
  }),
  execute: async ({ input }) => input,
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

    // Get list of files before discovery
    const filesBeforeDiscovery = await fs.readdir(testProjectPath, {
      recursive: true,
    });

    // Configure project and wait for discovery
    const configResponse = await app.request("/api/project", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "untouched-project",
        targetProjectPath: testProjectPath,
      }),
    });

    expect(configResponse.status).toBe(202);

    // Poll until discovery complete
    let discoveryComplete = false;
    let attempts = 0;

    while (!discoveryComplete && attempts < 100) {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const statusResponse = await app.request("/api/project/discovery/status");
      const statusData = (await statusResponse.json()) as DiscoveryStatus;

      if (!statusData.isDiscovering && statusData.phase === "complete") {
        discoveryComplete = true;
      }

      attempts++;
    }

    expect(discoveryComplete).toBe(true);

    // Get list of files after discovery
    const filesAfterDiscovery = await fs.readdir(testProjectPath, {
      recursive: true,
    });

    // Verify files are exactly the same (user's project untouched)
    expect(filesAfterDiscovery).toEqual(filesBeforeDiscovery);

    // Verify NO promptalicious files in user's project
    const projectFiles = await fs.readdir(testProjectPath, {
      recursive: true,
      withFileTypes: true,
    });
    const fileNames = projectFiles.map((f) => f.name);

    expect(fileNames.every((name) => !name.includes("promptalicious"))).toBe(
      true,
    );
    expect(fileNames.every((name) => !name.includes("workspace"))).toBe(true);

    // Verify workspace IS in promptalicious repo
    const workspacePath = path.join(TEST_WORKSPACE_DIR, "untouched-project");
    const workspaceExists = await fs
      .access(workspacePath)
      .then(() => true)
      .catch(() => false);
    expect(workspaceExists).toBe(true);

    await cleanupTestProject(testProjectPath);
    await cleanupTestProject(workspacePath);
  });
});

/**
 * Helper function to set up a test project fixture
 */
async function setupTestProject(
  projectPath: string,
  files: Record<string, string>,
): Promise<void> {
  await fs.mkdir(projectPath, { recursive: true });

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(projectPath, filePath);
    const dir = path.dirname(fullPath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content.trim(), "utf-8");
  }
}

/**
 * Helper function to clean up test project fixture
 */
async function cleanupTestProject(projectPath: string): Promise<void> {
  try {
    await fs.rm(projectPath, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}
