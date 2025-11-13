import path from "node:path";
import { fileURLToPath } from "node:url";

import { eq } from "drizzle-orm";

import { db } from "@/db/connection";
import { tools } from "@/db/schema/tools.schema";
import type {
  ToolDefinition as AdapterToolDefinition,
  ExecutionResultWithTools,
  SDKOptions,
} from "@/adapters/sdk-adapter.interface.js";
import { VercelAISDKAdapter } from "@/adapters/vercel-ai-sdk-adapter.js";

import {
  executeWorkspaceBeforeAll,
  executeWorkspaceAfterAll,
  executeToolLifecycle,
  resetAllToolStates,
} from "./hook-execution.service.js";

export interface ToolIntegrationResult extends ExecutionResultWithTools {
  toolInvocations: import("@/adapters/sdk-adapter.interface.js").ToolInvocationResult[];
}

export async function executeWithAdvancedOptions(
  prompt: string,
  apiKey: string,
  model: string,
  advancedOptions?: SDKOptions,
  abortSignal?: AbortSignal,
): Promise<ToolIntegrationResult> {
  resetAllToolStates();

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const repoRoot = path.resolve(__dirname, "../../../..");

  const enabledTools = await db
    .select()
    .from(tools)
    .where(eq(tools.enabled, true));

  let workspaceRootDir: string | undefined;
  let workspaceContext: Record<string, unknown> = {};

  if (enabledTools.length > 0) {
    const projectConfig = await db.query.projectConfiguration.findFirst();

    if (!projectConfig) {
      throw new Error(
        "No project configuration found. Please configure a project in Settings.",
      );
    }

    workspaceRootDir = path.resolve(repoRoot, projectConfig.workspacePath);
    workspaceContext = await executeWorkspaceBeforeAll(workspaceRootDir);
  }

  const adapterTools: AdapterToolDefinition[] = [];

  for (const tool of enabledTools) {
    const toolWorkspaceDir = path.resolve(repoRoot, tool.workspaceDir);

    const toolFilePath = path.join(toolWorkspaceDir, "tool.ts");

    let toolModule: { default: (params: unknown) => Promise<unknown> };
    try {
      const fileUrl = `file://${toolFilePath}?t=${Date.now()}`;
      toolModule = (await import(fileUrl)) as {
        default: (params: unknown) => Promise<unknown>;
      };
    } catch (error) {
      throw new Error(
        `Failed to load tool "${tool.name}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const toolExecuteFn = toolModule.default;

    const wrappedExecute = async (params: unknown): Promise<unknown> => {
      return executeToolLifecycle(
        toolWorkspaceDir,
        tool.id,
        toolExecuteFn,
        params,
        workspaceContext,
      );
    };

    adapterTools.push({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      parametersSchema: tool.parametersSchema,
      executeFunction: wrappedExecute,
      sourceFilePath: tool.sourceFilePath,
      detectedHookParams: (tool.detectedHookParams as string[]) || [],
    });
  }

  const adapter = new VercelAISDKAdapter();
  adapter.setApiKey(apiKey);
  adapter.setModel(model);
  if (abortSignal) {
    adapter.setAbortSignal(abortSignal);
  }

  const defaultOptions = adapter.getDefaultOptions();
  const mergedOptions = {
    ...defaultOptions,
    ...(advancedOptions || {}),
  };

  const validatedOptions = adapter.validateOptions(mergedOptions);

  const executionResult = await adapter.executeWithTools({
    prompt,
    tools: adapterTools,
    options: validatedOptions,
  });

  if (workspaceRootDir) {
    await executeWorkspaceAfterAll(workspaceRootDir);
  }

  return {
    ...executionResult,
    toolInvocations: executionResult.toolInvocations || [],
  };
}
