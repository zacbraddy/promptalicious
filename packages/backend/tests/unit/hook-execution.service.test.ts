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
});
