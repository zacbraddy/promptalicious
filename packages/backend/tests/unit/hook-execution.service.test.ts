import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as hookExecutionService from "@/services/hook-execution.service";

describe("hookExecutionService", () => {
  let tempWorkspaceDir: string;

  beforeEach(async () => {
    tempWorkspaceDir = await mkdtemp(path.join(tmpdir(), "hook-test-"));
    hookExecutionService.resetAllToolStates();
  });

  afterEach(async () => {
    try {
      await rm(tempWorkspaceDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("loadHook", () => {
    it("should load a hook file and return the exported function", async () => {
      const hookContent = `
        export default async function beforeAll() {
          return { context: "test" };
        }
      `;
      await writeFile(path.join(tempWorkspaceDir, "beforeAll.ts"), hookContent);

      const hookFn = await hookExecutionService.loadHook(
        tempWorkspaceDir,
        "beforeAll",
      );

      expect(hookFn).toBeDefined();
      expect(typeof hookFn).toBe("function");
    });

    it("should return null if hook file does not exist", async () => {
      const hookFn = await hookExecutionService.loadHook(
        tempWorkspaceDir,
        "beforeAll",
      );

      expect(hookFn).toBeNull();
    });

    it("should throw error if hook file exists but contains invalid syntax", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        "this is invalid TypeScript { syntax",
      );

      await expect(
        hookExecutionService.loadHook(tempWorkspaceDir, "beforeAll"),
      ).rejects.toThrow("Failed to load beforeAll hook");
    });
  });

  describe("executeHook", () => {
    it("should execute a hook function and return its result", async () => {
      const mockResult = { db: "connection", auth: "service" };
      const mockHookFn = vi.fn().mockResolvedValue(mockResult);

      const result = await hookExecutionService.executeHook(
        mockHookFn,
        "beforeAll",
      );

      expect(mockHookFn).toHaveBeenCalledOnce();
      expect(result).toEqual(mockResult);
    });

    it("should return empty object if hook returns null", async () => {
      const mockHookFn = vi.fn().mockResolvedValue(null);

      const result = await hookExecutionService.executeHook(
        mockHookFn,
        "beforeAll",
      );

      expect(result).toEqual({});
    });

    it("should return empty object if hook returns undefined", async () => {
      const mockHookFn = vi.fn().mockResolvedValue(undefined);

      const result = await hookExecutionService.executeHook(
        mockHookFn,
        "beforeAll",
      );

      expect(result).toEqual({});
    });

    it("should throw error with hook type if hook execution fails", async () => {
      const mockError = new Error("Database connection failed");
      const mockHookFn = vi.fn().mockRejectedValue(mockError);

      await expect(
        hookExecutionService.executeHook(mockHookFn, "beforeAll"),
      ).rejects.toThrow("Hook execution failed (beforeAll)");
    });
  });

  describe("executeToolLifecycle", () => {
    const mockToolId = "test-tool";
    const mockParams = { userId: "123" };

    it("should execute full lifecycle with all hooks present", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        export default async function beforeAll() {
          return { db: "connection" };
        }
      `,
      );

      await writeFile(
        path.join(tempWorkspaceDir, "beforeEach.ts"),
        `
        export default async function beforeEach() {
          return { requestId: "abc" };
        }
      `,
      );

      await writeFile(
        path.join(tempWorkspaceDir, "afterEach.ts"),
        `
        export default async function afterEach() {
          return undefined;
        }
      `,
      );

      await writeFile(
        path.join(tempWorkspaceDir, "afterAll.ts"),
        `
        export default async function afterAll() {
          return undefined;
        }
      `,
      );

      const mockToolExecute = vi.fn().mockResolvedValue({ result: "success" });

      const result = await hookExecutionService.executeToolLifecycle(
        tempWorkspaceDir,
        mockToolId,
        mockToolExecute,
        mockParams,
      );

      expect(mockToolExecute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "123",
          db: "connection",
          requestId: "abc",
        }),
      );
      expect(result).toEqual({ result: "success" });
    });

    it("should execute lifecycle with missing hooks", async () => {
      const mockToolExecute = vi.fn().mockResolvedValue({ result: "success" });

      const result = await hookExecutionService.executeToolLifecycle(
        tempWorkspaceDir,
        mockToolId,
        mockToolExecute,
        mockParams,
      );

      expect(mockToolExecute).toHaveBeenCalledWith(mockParams);
      expect(result).toEqual({ result: "success" });
    });

    it("should merge context from beforeAll and beforeEach with beforeEach taking precedence", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        export default async function beforeAll() {
          return { db: "connection", logger: "instance" };
        }
      `,
      );

      await writeFile(
        path.join(tempWorkspaceDir, "beforeEach.ts"),
        `
        export default async function beforeEach() {
          return { requestId: "abc", logger: "overridden" };
        }
      `,
      );

      const mockToolExecute = vi.fn().mockResolvedValue({ result: "success" });

      await hookExecutionService.executeToolLifecycle(
        tempWorkspaceDir,
        mockToolId,
        mockToolExecute,
        mockParams,
      );

      expect(mockToolExecute).toHaveBeenCalledWith({
        userId: "123",
        db: "connection",
        logger: "overridden",
        requestId: "abc",
      });
    });

    it("should abort execution if beforeAll hook fails", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        export default async function beforeAll() {
          throw new Error("Setup failed");
        }
      `,
      );

      const mockToolExecute = vi.fn().mockResolvedValue({ result: "success" });

      await expect(
        hookExecutionService.executeToolLifecycle(
          tempWorkspaceDir,
          mockToolId,
          mockToolExecute,
          mockParams,
        ),
      ).rejects.toThrow("Hook execution failed (beforeAll)");

      expect(mockToolExecute).not.toHaveBeenCalled();
    });

    it("should abort execution if beforeEach hook fails", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        export default async function beforeAll() {
          return { db: "connection" };
        }
      `,
      );

      await writeFile(
        path.join(tempWorkspaceDir, "beforeEach.ts"),
        `
        export default async function beforeEach() {
          throw new Error("Request setup failed");
        }
      `,
      );

      const mockToolExecute = vi.fn().mockResolvedValue({ result: "success" });

      await expect(
        hookExecutionService.executeToolLifecycle(
          tempWorkspaceDir,
          mockToolId,
          mockToolExecute,
          mockParams,
        ),
      ).rejects.toThrow("Hook execution failed (beforeEach)");

      expect(mockToolExecute).not.toHaveBeenCalled();
    });

    it("should execute afterEach even if tool execution fails", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "afterEach.ts"),
        `
        let callCount = 0;
        export default async function afterEach() {
          callCount++;
          globalThis.__afterEachCalled = callCount;
          return undefined;
        }
      `,
      );

      const mockToolExecuteWithError = vi
        .fn()
        .mockRejectedValue(new Error("Tool failed"));

      await expect(
        hookExecutionService.executeToolLifecycle(
          tempWorkspaceDir,
          mockToolId,
          mockToolExecuteWithError,
          mockParams,
        ),
      ).rejects.toThrow("Tool failed");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((globalThis as any).__afterEachCalled).toBe(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      delete (globalThis as any).__afterEachCalled;
    });

    it("should throw tool error if afterEach fails after tool succeeds", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "afterEach.ts"),
        `
        export default async function afterEach() {
          throw new Error("Cleanup failed");
        }
      `,
      );

      const mockToolExecute = vi.fn().mockResolvedValue({ result: "success" });

      await expect(
        hookExecutionService.executeToolLifecycle(
          tempWorkspaceDir,
          mockToolId,
          mockToolExecute,
          mockParams,
        ),
      ).rejects.toThrow("Hook execution failed (afterEach)");
    });

    it("should track beforeAll execution to run only once per tool", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        let callCount = 0;
        export default async function beforeAll() {
          callCount++;
          globalThis.__beforeAllCallCount = callCount;
          return { db: "connection" };
        }
      `,
      );

      const mockToolExecute = vi.fn().mockResolvedValue({ result: "success" });

      await hookExecutionService.executeToolLifecycle(
        tempWorkspaceDir,
        mockToolId,
        mockToolExecute,
        mockParams,
      );

      await hookExecutionService.executeToolLifecycle(
        tempWorkspaceDir,
        mockToolId,
        mockToolExecute,
        mockParams,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((globalThis as any).__beforeAllCallCount).toBe(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      delete (globalThis as any).__beforeAllCallCount;
    });
  });

  describe("resetToolState", () => {
    it("should reset beforeAll execution tracking for a tool", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        let callCount = 0;
        export default async function beforeAll() {
          callCount++;
          globalThis.__beforeAllResetTest = callCount;
          return { db: "connection" };
        }
      `,
      );

      const mockToolExecute = vi.fn().mockResolvedValue({ result: "success" });

      await hookExecutionService.executeToolLifecycle(
        tempWorkspaceDir,
        "tool-1",
        mockToolExecute,
        {},
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((globalThis as any).__beforeAllResetTest).toBe(1);

      hookExecutionService.resetToolState("tool-1");

      await hookExecutionService.executeToolLifecycle(
        tempWorkspaceDir,
        "tool-1",
        mockToolExecute,
        {},
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((globalThis as any).__beforeAllResetTest).toBe(2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      delete (globalThis as any).__beforeAllResetTest;
    });
  });

  describe("executeAfterAllHooks", () => {
    it("should execute afterAll hook if tool was invoked", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "afterAll.ts"),
        `
        export default async function afterAll() {
          globalThis.__afterAllExecuted = true;
          return undefined;
        }
      `,
      );

      const mockToolExecute = vi.fn().mockResolvedValue({ result: "success" });

      await hookExecutionService.executeToolLifecycle(
        tempWorkspaceDir,
        "tool-1",
        mockToolExecute,
        {},
      );

      await hookExecutionService.executeAfterAllHooks("tool-1");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((globalThis as any).__afterAllExecuted).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      delete (globalThis as any).__afterAllExecuted;
    });

    it("should not execute afterAll hook if tool was never invoked", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "afterAll.ts"),
        `
        export default async function afterAll() {
          globalThis.__afterAllNeverInvoked = true;
          return undefined;
        }
      `,
      );

      await hookExecutionService.executeAfterAllHooks("tool-never-invoked");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((globalThis as any).__afterAllNeverInvoked).toBeUndefined();
    });

    it("should execute afterAll only once per tool", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "afterAll.ts"),
        `
        let callCount = 0;
        export default async function afterAll() {
          callCount++;
          globalThis.__afterAllOnceTest = callCount;
          return undefined;
        }
      `,
      );

      const mockToolExecute = vi.fn().mockResolvedValue({ result: "success" });

      await hookExecutionService.executeToolLifecycle(
        tempWorkspaceDir,
        "tool-1",
        mockToolExecute,
        {},
      );

      await hookExecutionService.executeAfterAllHooks("tool-1");
      await hookExecutionService.executeAfterAllHooks("tool-1");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((globalThis as any).__afterAllOnceTest).toBe(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      delete (globalThis as any).__afterAllOnceTest;
    });

    it("should throw error if afterAll hook fails", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "afterAll.ts"),
        `
        export default async function afterAll() {
          throw new Error("Cleanup failed");
        }
      `,
      );

      const mockToolExecute = vi.fn().mockResolvedValue({ result: "success" });

      await hookExecutionService.executeToolLifecycle(
        tempWorkspaceDir,
        "tool-1",
        mockToolExecute,
        {},
      );

      await expect(
        hookExecutionService.executeAfterAllHooks("tool-1"),
      ).rejects.toThrow("Hook execution failed (afterAll)");
    });
  });

  describe("loadWorkspaceHook", () => {
    it("should load workspace beforeAll hook and return function", async () => {
      const hookContent = `
        export default async function beforeAll() {
          return { sharedDb: "connection" };
        }
      `;
      await writeFile(path.join(tempWorkspaceDir, "beforeAll.ts"), hookContent);

      const hookFn = await hookExecutionService.loadWorkspaceHook(
        tempWorkspaceDir,
        "beforeAll",
      );

      expect(hookFn).toBeDefined();
      expect(typeof hookFn).toBe("function");
    });

    it("should load workspace afterAll hook and return function", async () => {
      const hookContent = `
        export default async function afterAll() {
          return undefined;
        }
      `;
      await writeFile(path.join(tempWorkspaceDir, "afterAll.ts"), hookContent);

      const hookFn = await hookExecutionService.loadWorkspaceHook(
        tempWorkspaceDir,
        "afterAll",
      );

      expect(hookFn).toBeDefined();
      expect(typeof hookFn).toBe("function");
    });

    it("should return null if workspace hook file does not exist", async () => {
      const hookFn = await hookExecutionService.loadWorkspaceHook(
        tempWorkspaceDir,
        "beforeAll",
      );

      expect(hookFn).toBeNull();
    });

    it("should throw error if workspace hook file contains invalid syntax", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        "this is invalid TypeScript { syntax",
      );

      await expect(
        hookExecutionService.loadWorkspaceHook(tempWorkspaceDir, "beforeAll"),
      ).rejects.toThrow("Failed to load workspace beforeAll hook");
    });
  });

  describe("executeWorkspaceBeforeAll", () => {
    it("should execute workspace beforeAll hook and return context", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        export default async function beforeAll() {
          return { sharedDb: "connection", config: { env: "test" } };
        }
      `,
      );

      const context =
        await hookExecutionService.executeWorkspaceBeforeAll(tempWorkspaceDir);

      expect(context).toEqual({
        sharedDb: "connection",
        config: { env: "test" },
      });
    });

    it("should return empty object if workspace beforeAll hook does not exist", async () => {
      const context =
        await hookExecutionService.executeWorkspaceBeforeAll(tempWorkspaceDir);

      expect(context).toEqual({});
    });

    it("should cache workspace beforeAll context and return same context on subsequent calls", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        let callCount = 0;
        export default async function beforeAll() {
          callCount++;
          globalThis.__workspaceBeforeAllCallCount = callCount;
          return { sharedDb: "connection", callCount };
        }
      `,
      );

      const context1 =
        await hookExecutionService.executeWorkspaceBeforeAll(tempWorkspaceDir);
      const context2 =
        await hookExecutionService.executeWorkspaceBeforeAll(tempWorkspaceDir);

      expect(context1).toEqual({ sharedDb: "connection", callCount: 1 });
      expect(context2).toEqual({ sharedDb: "connection", callCount: 1 });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((globalThis as any).__workspaceBeforeAllCallCount).toBe(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      delete (globalThis as any).__workspaceBeforeAllCallCount;
    });

    it("should throw error if workspace beforeAll hook execution fails", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        export default async function beforeAll() {
          throw new Error("Workspace initialization failed");
        }
      `,
      );

      await expect(
        hookExecutionService.executeWorkspaceBeforeAll(tempWorkspaceDir),
      ).rejects.toThrow("Hook execution failed (beforeAll)");
    });
  });

  describe("executeWorkspaceAfterAll", () => {
    it("should execute workspace afterAll hook after beforeAll was called", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        export default async function beforeAll() {
          return { sharedDb: "connection" };
        }
      `,
      );

      await writeFile(
        path.join(tempWorkspaceDir, "afterAll.ts"),
        `
        export default async function afterAll() {
          globalThis.__workspaceAfterAllExecuted = true;
          return undefined;
        }
      `,
      );

      await hookExecutionService.executeWorkspaceBeforeAll(tempWorkspaceDir);
      await hookExecutionService.executeWorkspaceAfterAll(tempWorkspaceDir);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((globalThis as any).__workspaceAfterAllExecuted).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      delete (globalThis as any).__workspaceAfterAllExecuted;
    });

    it("should not execute workspace afterAll if beforeAll was never called", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "afterAll.ts"),
        `
        export default async function afterAll() {
          globalThis.__workspaceAfterAllNeverCalled = true;
          return undefined;
        }
      `,
      );

      await hookExecutionService.executeWorkspaceAfterAll(tempWorkspaceDir);

      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        (globalThis as any).__workspaceAfterAllNeverCalled,
      ).toBeUndefined();
    });

    it("should execute workspace afterAll only once", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        export default async function beforeAll() {
          return { sharedDb: "connection" };
        }
      `,
      );

      await writeFile(
        path.join(tempWorkspaceDir, "afterAll.ts"),
        `
        let callCount = 0;
        export default async function afterAll() {
          callCount++;
          globalThis.__workspaceAfterAllCallCount = callCount;
          return undefined;
        }
      `,
      );

      await hookExecutionService.executeWorkspaceBeforeAll(tempWorkspaceDir);
      await hookExecutionService.executeWorkspaceAfterAll(tempWorkspaceDir);
      await hookExecutionService.executeWorkspaceAfterAll(tempWorkspaceDir);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((globalThis as any).__workspaceAfterAllCallCount).toBe(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      delete (globalThis as any).__workspaceAfterAllCallCount;
    });

    it("should throw error if workspace afterAll hook fails", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        export default async function beforeAll() {
          return { sharedDb: "connection" };
        }
      `,
      );

      await writeFile(
        path.join(tempWorkspaceDir, "afterAll.ts"),
        `
        export default async function afterAll() {
          throw new Error("Workspace cleanup failed");
        }
      `,
      );

      await hookExecutionService.executeWorkspaceBeforeAll(tempWorkspaceDir);

      await expect(
        hookExecutionService.executeWorkspaceAfterAll(tempWorkspaceDir),
      ).rejects.toThrow("Hook execution failed (afterAll)");
    });

    it("should do nothing if workspace afterAll hook does not exist", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        export default async function beforeAll() {
          return { sharedDb: "connection" };
        }
      `,
      );

      await hookExecutionService.executeWorkspaceBeforeAll(tempWorkspaceDir);

      await expect(
        hookExecutionService.executeWorkspaceAfterAll(tempWorkspaceDir),
      ).resolves.toBeUndefined();
    });
  });

  describe("executeToolLifecycle with workspace context", () => {
    const mockToolId = "test-tool";
    const mockParams = { userId: "123" };

    it("should merge workspace context with tool contexts", async () => {
      const workspaceContext = { sharedDb: "connection", config: "shared" };

      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        export default async function beforeAll() {
          return { toolDb: "tool-connection", config: "tool-override" };
        }
      `,
      );

      await writeFile(
        path.join(tempWorkspaceDir, "beforeEach.ts"),
        `
        export default async function beforeEach() {
          return { requestId: "abc", config: "request-override" };
        }
      `,
      );

      const mockToolExecute = vi.fn().mockResolvedValue({ result: "success" });

      await hookExecutionService.executeToolLifecycle(
        tempWorkspaceDir,
        mockToolId,
        mockToolExecute,
        mockParams,
        workspaceContext,
      );

      expect(mockToolExecute).toHaveBeenCalledWith({
        userId: "123",
        sharedDb: "connection",
        config: "request-override",
        toolDb: "tool-connection",
        requestId: "abc",
      });
    });

    it("should use tool context to override workspace context", async () => {
      const workspaceContext = { db: "workspace-db", logger: "workspace" };

      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        export default async function beforeAll() {
          return { db: "tool-db" };
        }
      `,
      );

      const mockToolExecute = vi.fn().mockResolvedValue({ result: "success" });

      await hookExecutionService.executeToolLifecycle(
        tempWorkspaceDir,
        mockToolId,
        mockToolExecute,
        mockParams,
        workspaceContext,
      );

      expect(mockToolExecute).toHaveBeenCalledWith({
        userId: "123",
        db: "tool-db",
        logger: "workspace",
      });
    });

    it("should use beforeEach context to override workspace and tool contexts", async () => {
      const workspaceContext = {
        db: "workspace-db",
        logger: "workspace",
        requestId: "workspace-request",
      };

      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        export default async function beforeAll() {
          return { db: "tool-db", requestId: "tool-request" };
        }
      `,
      );

      await writeFile(
        path.join(tempWorkspaceDir, "beforeEach.ts"),
        `
        export default async function beforeEach() {
          return { requestId: "invocation-request" };
        }
      `,
      );

      const mockToolExecute = vi.fn().mockResolvedValue({ result: "success" });

      await hookExecutionService.executeToolLifecycle(
        tempWorkspaceDir,
        mockToolId,
        mockToolExecute,
        mockParams,
        workspaceContext,
      );

      expect(mockToolExecute).toHaveBeenCalledWith({
        userId: "123",
        db: "tool-db",
        logger: "workspace",
        requestId: "invocation-request",
      });
    });

    it("should work when workspace context is undefined", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        export default async function beforeAll() {
          return { db: "connection" };
        }
      `,
      );

      const mockToolExecute = vi.fn().mockResolvedValue({ result: "success" });

      await hookExecutionService.executeToolLifecycle(
        tempWorkspaceDir,
        mockToolId,
        mockToolExecute,
        mockParams,
        undefined,
      );

      expect(mockToolExecute).toHaveBeenCalledWith({
        userId: "123",
        db: "connection",
      });
    });
  });

  describe("resetWorkspaceState", () => {
    it("should reset workspace beforeAll execution tracking", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        let callCount = 0;
        export default async function beforeAll() {
          callCount++;
          globalThis.__workspaceResetTest = callCount;
          return { db: "connection" };
        }
      `,
      );

      await hookExecutionService.executeWorkspaceBeforeAll(tempWorkspaceDir);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((globalThis as any).__workspaceResetTest).toBe(1);

      hookExecutionService.resetWorkspaceState(tempWorkspaceDir);

      await hookExecutionService.executeWorkspaceBeforeAll(tempWorkspaceDir);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((globalThis as any).__workspaceResetTest).toBe(2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      delete (globalThis as any).__workspaceResetTest;
    });
  });

  describe("resetAllToolStates", () => {
    it("should reset both tool and workspace states", async () => {
      await writeFile(
        path.join(tempWorkspaceDir, "beforeAll.ts"),
        `
        let callCount = 0;
        export default async function beforeAll() {
          callCount++;
          globalThis.__resetAllStatesTest = callCount;
          return { db: "connection" };
        }
      `,
      );

      await hookExecutionService.executeWorkspaceBeforeAll(tempWorkspaceDir);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((globalThis as any).__resetAllStatesTest).toBe(1);

      hookExecutionService.resetAllToolStates();

      await hookExecutionService.executeWorkspaceBeforeAll(tempWorkspaceDir);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      expect((globalThis as any).__resetAllStatesTest).toBe(2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      delete (globalThis as any).__resetAllStatesTest;
    });
  });
});
