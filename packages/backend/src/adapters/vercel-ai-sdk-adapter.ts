import { generateText, stepCountIs, StopCondition, tool, jsonSchema } from "ai";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import type { JSONSchema7 } from "json-schema";

import type {
  SDKAdapter,
  ToolDefinition,
  ExecutionParams,
  ExecutionResultWithTools,
  SDKOptions,
  ToolInvocationResult,
} from "./sdk-adapter.interface.js";

export class VercelAISDKAdapter implements SDKAdapter {
  name = "vercel-ai-sdk";
  private apiKey?: string;
  private model?: string;
  private abortSignal?: AbortSignal;

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setModel(model: string): void {
    this.model = model;
  }

  setAbortSignal(signal: AbortSignal): void {
    this.abortSignal = signal;
  }

  discoverTools(_projectPath: string): Promise<ToolDefinition[]> {
    throw new Error(
      "Tool discovery is not implemented in VercelAISDKAdapter. Use ToolDiscoveryService instead.",
    );
  }

  async executeWithTools(
    params: ExecutionParams,
  ): Promise<ExecutionResultWithTools> {
    const { prompt, tools, options } = params;

    const validatedOptions = this.validateOptions(options);

    const startTime = Date.now();

    if (!this.apiKey) {
      throw new Error(
        "API key not set. Please set API key via setApiKey() before calling executeWithTools().",
      );
    }

    const provider = createOpenAI({
      apiKey: this.apiKey,
    });

    const toolInvocations: ToolInvocationResult[] = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aiTools: Record<string, any> = {};

    for (const toolDef of tools) {
      let inputSchemaForTool: z.ZodTypeAny | ReturnType<typeof jsonSchema>;

      if (toolDef.inputSchema instanceof z.ZodType) {
        inputSchemaForTool = toolDef.inputSchema;
      } else if (
        toolDef.inputSchema &&
        typeof toolDef.inputSchema === "object" &&
        "type" in toolDef.inputSchema
      ) {
        inputSchemaForTool = jsonSchema(toolDef.inputSchema as JSONSchema7);
      } else {
        inputSchemaForTool = z.object({});
      }

      const executeWrapper = async (input: unknown) => {
        const toolStartTime = Date.now();
        const timestamp = new Date();

        try {
          const result = await toolDef.executeFunction(input);
          const executionDurationMs = Date.now() - toolStartTime;

          const invocation: ToolInvocationResult = {
            toolId: toolDef.id,
            toolName: toolDef.name,
            timestamp,
            inputParams: input,
            output: result,
            executionDurationMs,
            inputTokens: null,
            outputTokens: null,
            success: true,
            errorType: null,
            errorMessage: null,
            errorStack: null,
            llmReasoning: null,
            debugOutput: [],
          };

          toolInvocations.push(invocation);

          return result;
        } catch (error) {
          const executionDurationMs = Date.now() - toolStartTime;

          const invocation: ToolInvocationResult = {
            toolId: toolDef.id,
            toolName: toolDef.name,
            timestamp,
            inputParams: input,
            output: null,
            executionDurationMs,
            inputTokens: null,
            outputTokens: null,
            success: false,
            errorType: error instanceof Error ? error.name : "UnknownError",
            errorMessage:
              error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? (error.stack ?? null) : null,
            llmReasoning: null,
            debugOutput: [],
          };

          toolInvocations.push(invocation);

          throw error;
        }
      };

      aiTools[toolDef.name] = tool({
        description: toolDef.description,
        inputSchema: inputSchemaForTool,
        execute: executeWrapper,
      });
    }

    const toolChoice = validatedOptions.toolChoice;
    const toolChoiceValue:
      | "auto"
      | "none"
      | "required"
      | { type: "tool"; toolName: string }
      | undefined =
      toolChoice === "auto" ||
      toolChoice === "none" ||
      toolChoice === "required"
        ? toolChoice
        : toolChoice
          ? { type: "tool", toolName: toolChoice }
          : undefined;

    const generateTextOptions: {
      model: ReturnType<typeof provider>;
      prompt: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: Record<string, any>;
      toolChoice?: typeof toolChoiceValue;
      temperature?: number;
      topP?: number;
      maxTokens?: number;
      maxRetries?: number;
      abortSignal?: AbortSignal;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stopWhen?: StopCondition<any>;
    } = {
      model: provider(this.model ?? "gpt-4o-mini"),
      prompt,
      tools: aiTools,
      toolChoice: toolChoiceValue,
      temperature: validatedOptions.temperature,
      topP: validatedOptions.topP,
      maxTokens: validatedOptions.maxTokens,
      maxRetries: validatedOptions.maxRetries,
      abortSignal: this.abortSignal,
      stopWhen: stepCountIs(10),
    };

    const result = await generateText(generateTextOptions);

    const executionDurationMs = Date.now() - startTime;

    return {
      responseText: result.text,
      inputTokenCount: result.usage.inputTokens ?? 0,
      outputTokenCount: result.usage.outputTokens ?? 0,
      totalTokenCount: result.usage.totalTokens ?? 0,
      executionDurationMs,
      toolInvocations: toolInvocations.length > 0 ? toolInvocations : undefined,
    };
  }

  validateOptions(options: unknown): SDKOptions {
    const schema = z.object({
      toolChoice: z
        .union([z.literal("auto"), z.literal("required"), z.literal("none")])
        .or(z.string())
        .optional(),
      maxToolRoundtrips: z.number().int().positive().optional(),
      temperature: z.number().min(0).max(2).optional(),
      topP: z.number().min(0).max(1).optional(),
      maxTokens: z.number().int().positive().optional(),
      maxRetries: z.number().int().nonnegative().optional(),
    });

    const result = schema.safeParse(options);

    if (!result.success) {
      throw new Error(
        `Invalid SDK options: ${result.error.issues.map((i) => i.message).join(", ")}`,
      );
    }

    return result.data;
  }

  getDefaultOptions(): SDKOptions {
    return {
      toolChoice: "auto",
      temperature: 1.0,
      topP: 1.0,
      maxTokens: 4096,
      maxRetries: 2,
    };
  }
}
