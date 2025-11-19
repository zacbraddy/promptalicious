/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type DiscoveredTool,
  WorkspaceGeneratorService,
} from "@/services/workspace-generator.service";

const {
  mockAppendLog,
  mockIncrementCounters,
  mockMkdir,
  mockWriteFile,
  mockSymlink,
  mockUnlink,
} = vi.hoisted(() => ({
  mockAppendLog: vi.fn(),
  mockIncrementCounters: vi.fn(),
  mockMkdir: vi.fn(),
  mockWriteFile: vi.fn(),
  mockSymlink: vi.fn(),
  mockUnlink: vi.fn(),
}));

vi.mock("@/services/discovery-status.service", () => ({
  appendLog: mockAppendLog,
  incrementCounters: mockIncrementCounters,
}));

vi.mock("node:fs/promises", () => ({
  mkdir: mockMkdir,
  writeFile: mockWriteFile,
  symlink: mockSymlink,
  unlink: mockUnlink,
}));

describe("WorkspaceGeneratorService", () => {
  let workspaceGeneratorService: WorkspaceGeneratorService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockSymlink.mockResolvedValue(undefined);
    mockUnlink.mockRejectedValue(new Error("ENOENT"));

    workspaceGeneratorService = new WorkspaceGeneratorService();
  });

  describe("generateWorkspace", () => {
    it("should create workspace directory for project", async () => {
      const projectName = "test-project";
      const projectPath = "../test-project";
      const tools: DiscoveredTool[] = [];

      await workspaceGeneratorService.generateWorkspace(
        projectName,
        projectPath,
        tools,
      );

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining("workspace/test-project"),
        { recursive: true },
      );
    });

    it("should generate workspace config files", async () => {
      const projectName = "test-project";
      const projectPath = "../test-project";
      const tools: DiscoveredTool[] = [];

      await workspaceGeneratorService.generateWorkspace(
        projectName,
        projectPath,
        tools,
      );

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("workspace/test-project/tsconfig.json"),
        expect.any(String),
      );

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("workspace/test-project/eslint.config.ts"),
        expect.any(String),
      );

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining("workspace/test-project/package.json"),
        expect.any(String),
      );

      const tsconfigCall = mockWriteFile.mock.calls.find((call) =>
        String(call[0]).includes("tsconfig.json"),
      );
      expect(tsconfigCall).toBeDefined();

      const tsconfigContent = JSON.parse(String(tsconfigCall![1])) as {
        extends: string;
      };
      expect(tsconfigContent.extends).toBe("../tsconfig.json");
    });

    it("should create tool subdirectory for each tool", async () => {
      const projectName = "test-project";
      const projectPath = "../test-project";
      const tools: DiscoveredTool[] = [
        {
          id: "getUserProfile",
          name: "getUserProfile",
          description: "Get user profile",
          sourceDescription: "Get user profile",
          parametersSchema: {},
          schemaImport: null,
          executeFunction: "async function execute() {}",
          sourceFilePath: "/path/to/tool.ts",
          detectedHookParams: [],
          typeImports: [],
          environmentTypes: [],
        },
      ];

      await workspaceGeneratorService.generateWorkspace(
        projectName,
        projectPath,
        tools,
      );

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining("workspace/test-project/getUserProfile"),
        { recursive: true },
      );
    });

    it("should generate tool.ts with extracted execute function", async () => {
      const projectName = "test-project";
      const projectPath = "../test-project";
      const executeFunction =
        "async function execute({ userId }) { return userId; }";
      const tools: DiscoveredTool[] = [
        {
          id: "getUserProfile",
          name: "getUserProfile",
          description: "Get user profile",
          sourceDescription: "Get user profile",
          parametersSchema: {},
          schemaImport: null,
          executeFunction,
          sourceFilePath: "/path/to/tool.ts",
          detectedHookParams: [],
          typeImports: [],
          environmentTypes: [],
        },
      ];

      await workspaceGeneratorService.generateWorkspace(
        projectName,
        projectPath,
        tools,
      );

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(
          "workspace/test-project/getUserProfile/tool.ts",
        ),
        expect.stringContaining(executeFunction),
      );
    });

    it("should generate all four hook stub files", async () => {
      const projectName = "test-project";
      const projectPath = "../test-project";
      const tools: DiscoveredTool[] = [
        {
          id: "getUserProfile",
          name: "getUserProfile",
          description: "Get user profile",
          sourceDescription: "Get user profile",
          parametersSchema: {},
          schemaImport: null,
          executeFunction: "async function execute() {}",
          sourceFilePath: "/path/to/tool.ts",
          detectedHookParams: ["db"],
          typeImports: [],
          environmentTypes: [],
        },
      ];

      await workspaceGeneratorService.generateWorkspace(
        projectName,
        projectPath,
        tools,
      );

      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(
          "workspace/test-project/getUserProfile/beforeAll.ts",
        ),
        expect.any(String),
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(
          "workspace/test-project/getUserProfile/beforeEach.ts",
        ),
        expect.any(String),
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(
          "workspace/test-project/getUserProfile/afterEach.ts",
        ),
        expect.any(String),
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining(
          "workspace/test-project/getUserProfile/afterAll.ts",
        ),
        expect.any(String),
      );
    });

    it("should include detected parameters as TODO comments in hook stubs", async () => {
      const projectName = "test-project";
      const projectPath = "../test-project";
      const tools: DiscoveredTool[] = [
        {
          id: "getUserProfile",
          name: "getUserProfile",
          description: "Get user profile",
          sourceDescription: "Get user profile",
          parametersSchema: {},
          schemaImport: null,
          executeFunction: "async function execute() {}",
          sourceFilePath: "/path/to/tool.ts",
          detectedHookParams: ["db", "authService"],
          typeImports: [],
          environmentTypes: [],
        },
      ];

      await workspaceGeneratorService.generateWorkspace(
        projectName,
        projectPath,
        tools,
      );

      const toolBeforeAllCall = mockWriteFile.mock.calls.find(
        (call) =>
          String(call[0]).includes("getUserProfile") &&
          String(call[0]).includes("beforeAll.ts"),
      );
      expect(toolBeforeAllCall).toBeDefined();

      const beforeAllContent = String(toolBeforeAllCall![1]);
      expect(beforeAllContent).toContain("db");
      expect(beforeAllContent).toContain("authService");
      expect(beforeAllContent).toContain("TODO");
    });

    it("should emit filesystem events to Discovery Status Service", async () => {
      const projectName = "test-project";
      const projectPath = "../test-project";
      const tools: DiscoveredTool[] = [
        {
          id: "getUserProfile",
          name: "getUserProfile",
          description: "Get user profile",
          sourceDescription: "Get user profile",
          parametersSchema: {},
          schemaImport: null,
          executeFunction: "async function execute() {}",
          sourceFilePath: "/path/to/tool.ts",
          detectedHookParams: [],
          typeImports: [],
          environmentTypes: [],
        },
      ];

      await workspaceGeneratorService.generateWorkspace(
        projectName,
        projectPath,
        tools,
      );

      expect(mockAppendLog).toHaveBeenCalled();
      expect(mockIncrementCounters).toHaveBeenCalledWith({
        filesGenerated: expect.any(Number),
      });
    });

    it("should handle filesystem errors gracefully", async () => {
      const projectName = "test-project";
      const projectPath = "../test-project";
      const tools: DiscoveredTool[] = [];

      mockMkdir.mockRejectedValueOnce(new Error("Permission denied"));

      await expect(
        workspaceGeneratorService.generateWorkspace(
          projectName,
          projectPath,
          tools,
        ),
      ).rejects.toThrow("Permission denied");

      expect(mockAppendLog).toHaveBeenCalledWith({
        level: "error",
        phase: "generating",
        message: expect.stringContaining("Failed to generate workspace"),
        context: expect.objectContaining({
          error: "Permission denied",
        }),
      });
    });
  });
});
