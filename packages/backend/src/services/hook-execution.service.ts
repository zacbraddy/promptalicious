import path from "node:path";
import { access } from "node:fs/promises";

type HookType = "beforeAll" | "beforeEach" | "afterEach" | "afterAll";
type HookFunction = () => Promise<Record<string, unknown> | void>;

interface ToolState {
  beforeAllExecuted: boolean;
  beforeAllContext: Record<string, unknown>;
  afterAllExecuted: boolean;
  workspaceDir: string;
}

interface WorkspaceState {
  beforeAllExecuted: boolean;
  beforeAllContext: Record<string, unknown>;
  afterAllExecuted: boolean;
  workspaceRootDir: string;
}

const toolStates = new Map<string, ToolState>();
const workspaceStates = new Map<string, WorkspaceState>();

export async function loadHook(
  workspaceDir: string,
  hookType: HookType,
): Promise<HookFunction | null> {
  const hookPath = path.join(workspaceDir, `${hookType}.ts`);

  try {
    await access(hookPath);
  } catch {
    return null;
  }

  try {
    const fileUrl = `file://${hookPath}?t=${Date.now()}`;
    const hookModule = (await import(fileUrl)) as { default: HookFunction };
    return hookModule.default;
  } catch (error) {
    throw new Error(
      `Failed to load ${hookType} hook: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function executeHook(
  hookFn: HookFunction,
  hookType: HookType,
): Promise<Record<string, unknown>> {
  try {
    const result = await hookFn();
    return result || {};
  } catch (error) {
    throw new Error(
      `Hook execution failed (${hookType}): ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function loadWorkspaceHook(
  workspaceRootDir: string,
  hookType: "beforeAll" | "afterAll",
): Promise<HookFunction | null> {
  const hookPath = path.join(workspaceRootDir, `${hookType}.ts`);

  try {
    await access(hookPath);
  } catch {
    return null;
  }

  try {
    const fileUrl = `file://${hookPath}?t=${Date.now()}`;
    const hookModule = (await import(fileUrl)) as { default: HookFunction };
    return hookModule.default;
  } catch (error) {
    throw new Error(
      `Failed to load workspace ${hookType} hook: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function executeWorkspaceBeforeAll(
  workspaceRootDir: string,
): Promise<Record<string, unknown>> {
  let workspaceState = workspaceStates.get(workspaceRootDir);
  if (!workspaceState) {
    workspaceState = {
      beforeAllExecuted: false,
      beforeAllContext: {},
      afterAllExecuted: false,
      workspaceRootDir,
    };
    workspaceStates.set(workspaceRootDir, workspaceState);
  }

  if (workspaceState.beforeAllExecuted) {
    return workspaceState.beforeAllContext;
  }

  const beforeAllFn = await loadWorkspaceHook(workspaceRootDir, "beforeAll");
  if (beforeAllFn) {
    workspaceState.beforeAllContext = await executeHook(
      beforeAllFn,
      "beforeAll",
    );
  }
  workspaceState.beforeAllExecuted = true;

  return workspaceState.beforeAllContext;
}

export async function executeWorkspaceAfterAll(
  workspaceRootDir: string,
): Promise<void> {
  const workspaceState = workspaceStates.get(workspaceRootDir);

  if (!workspaceState || !workspaceState.beforeAllExecuted) {
    return;
  }

  if (workspaceState.afterAllExecuted) {
    return;
  }

  const afterAllFn = await loadWorkspaceHook(workspaceRootDir, "afterAll");
  if (afterAllFn) {
    await executeHook(afterAllFn, "afterAll");
  }

  workspaceState.afterAllExecuted = true;
}

export async function executeToolLifecycle(
  workspaceDir: string,
  toolId: string,
  toolExecute: (params: unknown) => Promise<unknown>,
  params: unknown,
  workspaceContext?: Record<string, unknown>,
): Promise<unknown> {
  let toolState = toolStates.get(toolId);
  if (!toolState) {
    toolState = {
      beforeAllExecuted: false,
      beforeAllContext: {},
      afterAllExecuted: false,
      workspaceDir,
    };
    toolStates.set(toolId, toolState);
  }

  let beforeAllContext = toolState.beforeAllContext;
  if (!toolState.beforeAllExecuted) {
    const beforeAllFn = await loadHook(workspaceDir, "beforeAll");
    if (beforeAllFn) {
      beforeAllContext = await executeHook(beforeAllFn, "beforeAll");
      toolState.beforeAllContext = beforeAllContext;
    }
    toolState.beforeAllExecuted = true;
  }

  const beforeEachFn = await loadHook(workspaceDir, "beforeEach");
  let beforeEachContext: Record<string, unknown> = {};
  if (beforeEachFn) {
    beforeEachContext = await executeHook(beforeEachFn, "beforeEach");
  }

  const mergedParams = {
    ...(typeof params === "object" && params !== null ? params : {}),
    ...(workspaceContext || {}),
    ...beforeAllContext,
    ...beforeEachContext,
  };

  let toolResult: unknown;
  let toolError: Error | undefined;

  try {
    toolResult = await toolExecute(mergedParams);
  } catch (error) {
    toolError = error as Error;
  }

  const afterEachFn = await loadHook(workspaceDir, "afterEach");
  if (afterEachFn) {
    await executeHook(
      () => afterEachFn().then(() => ({ result: toolResult })),
      "afterEach",
    );
  }

  if (toolError) {
    throw toolError;
  }

  return toolResult;
}

export async function executeAfterAllHooks(toolId: string): Promise<void> {
  const toolState = toolStates.get(toolId);

  if (!toolState || !toolState.beforeAllExecuted) {
    return;
  }

  if (toolState.afterAllExecuted) {
    return;
  }

  const afterAllFn = await loadHook(toolState.workspaceDir, "afterAll");
  if (afterAllFn) {
    await executeHook(afterAllFn, "afterAll");
  }

  toolState.afterAllExecuted = true;
}

export function resetToolState(toolId: string): void {
  toolStates.delete(toolId);
}

export function resetWorkspaceState(workspaceRootDir: string): void {
  workspaceStates.delete(workspaceRootDir);
}

export function resetAllToolStates(): void {
  toolStates.clear();
  workspaceStates.clear();
}
