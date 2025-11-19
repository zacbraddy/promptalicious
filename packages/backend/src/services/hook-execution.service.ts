import path from "node:path";
import { access } from "node:fs/promises";
import { Module } from "node:module";

import { createJiti } from "jiti";
import { getTsconfig } from "get-tsconfig";

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
  globalKeys: Set<string>;
}

const toolStates = new Map<string, ToolState>();
const workspaceStates = new Map<string, WorkspaceState>();

function createConfiguredJiti(importUrl: string, workspaceDir?: string) {
  const tsconfig = getTsconfig();

  const alias: Record<string, string> = {};

  if (tsconfig?.config.compilerOptions?.paths) {
    const baseUrl = tsconfig.config.compilerOptions.baseUrl || ".";
    const tsconfigDir = path.dirname(tsconfig.path);

    for (const [key, values] of Object.entries(
      tsconfig.config.compilerOptions.paths,
    )) {
      const aliasKey = key.replace(/\/\*$/, "");
      const aliasValue = (values[0] ?? "").replace(/\/\*$/, "");

      alias[aliasKey] = path.resolve(tsconfigDir, baseUrl, aliasValue);
    }
  }

  const jitiOptions: {
    alias: Record<string, string>;
    moduleCache?: false;
    esmResolve?: boolean;
  } = {
    alias,
    moduleCache: false,
    esmResolve: true,
  };

  if (workspaceDir) {
    return createJiti(workspaceDir, jitiOptions);
  }

  return createJiti(importUrl, jitiOptions);
}

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
    const targetProjectNodeModules = path.join(
      workspaceRootDir,
      "rootalicious/node_modules",
    );
    const workspaceNodeModules = path.join(workspaceRootDir, "node_modules");
    const rootaliciousPath = path.join(workspaceRootDir, "rootalicious");

    const originalNodePath = process.env.NODE_PATH || "";
    const originalCwd = process.cwd();

    process.env.NODE_PATH = `${targetProjectNodeModules}:${workspaceNodeModules}:${originalNodePath}`;
    process.chdir(rootaliciousPath);

    (Module as { _initPaths?: () => void })._initPaths?.();

    try {
      const jiti = createConfiguredJiti(import.meta.url, workspaceRootDir);
      const hookModule = await jiti.import(hookPath, { default: true });

      return hookModule as HookFunction;
    } finally {
      process.chdir(originalCwd);
    }
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
      globalKeys: new Set<string>(),
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

  for (const key of workspaceState.globalKeys) {
    delete (globalThis as Record<string, unknown>)[key];
  }
  workspaceState.globalKeys.clear();

  workspaceState.afterAllExecuted = true;
}

export async function executeToolLifecycle(
  workspaceDir: string,
  toolId: string,
  toolExecute: (params: unknown) => Promise<unknown>,
  params: unknown,
  workspaceContext?: Record<string, unknown>,
  workspaceRootDir?: string,
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

  const environmentContext = {
    ...(workspaceContext || {}),
    ...beforeAllContext,
    ...beforeEachContext,
  };

  for (const [key, value] of Object.entries(environmentContext)) {
    (globalThis as Record<string, unknown>)[key] = value;

    if (workspaceRootDir) {
      const workspaceState = workspaceStates.get(workspaceRootDir);
      if (workspaceState) {
        workspaceState.globalKeys.add(key);
      }
    }
  }

  let toolResult: unknown;
  let toolError: Error | undefined;

  try {
    toolResult = await toolExecute(params);
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
