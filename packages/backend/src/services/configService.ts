import { eq } from "drizzle-orm";
import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

import { db } from "../db/connection.js";
import { llmConfig } from "../db/schema.js";
import { logger } from "../lib/logger.js";

export interface UpdateConfigData {
  selectedModel?: string;
  apiKey?: string;
  providerEndpoint?: string;
}

export interface ConfigData {
  id: number;
  selectedModel: string;
  providerEndpoint: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  error?: {
    errorType: string;
    errorCode?: string;
  };
}

export async function getConfig(): Promise<ConfigData | null> {
  try {
    const result = await db
      .select({
        id: llmConfig.id,
        selectedModel: llmConfig.selectedModel,
        providerEndpoint: llmConfig.providerEndpoint,
        createdAt: llmConfig.createdAt,
        updatedAt: llmConfig.updatedAt,
      })
      .from(llmConfig)
      .where(eq(llmConfig.id, 1))
      .limit(1);

    if (result.length === 0 || !result[0]) {
      return null;
    }

    return result[0];
  } catch (error) {
    logger.error({ error }, "Failed to retrieve configuration");
    throw new Error("Failed to retrieve configuration");
  }
}

export async function updateConfig(
  data: UpdateConfigData,
): Promise<ConfigData> {
  try {
    const updateData: Record<string, string | null | Date> = {};

    if (data.selectedModel !== undefined) {
      updateData.selectedModel = data.selectedModel;
    }
    if (data.apiKey !== undefined) {
      updateData.apiKey = data.apiKey;
    }
    if (data.providerEndpoint !== undefined) {
      updateData.providerEndpoint = data.providerEndpoint;
    }

    updateData.updatedAt = new Date();

    const existingConfig = await getConfig();

    if (existingConfig) {
      const result = await db
        .update(llmConfig)
        .set(updateData)
        .where(eq(llmConfig.id, 1))
        .returning({
          id: llmConfig.id,
          selectedModel: llmConfig.selectedModel,
          providerEndpoint: llmConfig.providerEndpoint,
          createdAt: llmConfig.createdAt,
          updatedAt: llmConfig.updatedAt,
        });

      if (!result[0]) {
        throw new Error("Failed to update configuration: No result returned");
      }

      return result[0];
    } else {
      const insertData = {
        id: 1,
        selectedModel: data.selectedModel || "gpt-4o-mini",
        apiKey: data.apiKey || "",
        providerEndpoint: data.providerEndpoint || null,
      };

      const result = await db.insert(llmConfig).values(insertData).returning({
        id: llmConfig.id,
        selectedModel: llmConfig.selectedModel,
        providerEndpoint: llmConfig.providerEndpoint,
        createdAt: llmConfig.createdAt,
        updatedAt: llmConfig.updatedAt,
      });

      if (!result[0]) {
        throw new Error("Failed to insert configuration: No result returned");
      }

      return result[0];
    }
  } catch (error) {
    logger.error({ error }, "Failed to update configuration");
    throw new Error("Failed to update configuration");
  }
}

export async function testConnection(
  apiKey: string,
  model: string,
): Promise<TestConnectionResult> {
  try {
    logger.info({ model }, "Testing LLM connection");

    const openaiProvider = createOpenAI({
      apiKey,
    });

    const result = await generateText({
      model: openaiProvider(model),
      prompt: "Respond with just the word 'OK'",
    });

    if (result.text) {
      logger.info("LLM connection test successful");
      return {
        success: true,
        message: `Successfully connected to OpenAI API with ${model}`,
      };
    }

    return {
      success: false,
      message: "Connection test failed: No response from LLM",
      error: {
        errorType: "api_error",
      },
    };
  } catch (error: unknown) {
    logger.error({ error }, "LLM connection test failed");

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      if (
        errorMessage.includes("api key") ||
        errorMessage.includes("authentication") ||
        errorMessage.includes("unauthorized") ||
        errorMessage.includes("401")
      ) {
        return {
          success: false,
          message: "Connection failed: Invalid API key",
          error: {
            errorType: "authentication",
            errorCode: "invalid_api_key",
          },
        };
      }

      if (
        errorMessage.includes("network") ||
        errorMessage.includes("econnrefused") ||
        errorMessage.includes("timeout")
      ) {
        return {
          success: false,
          message: "Connection failed: Network error",
          error: {
            errorType: "network",
          },
        };
      }

      if (
        errorMessage.includes("rate limit") ||
        errorMessage.includes("too many requests") ||
        errorMessage.includes("429")
      ) {
        return {
          success: false,
          message: "Connection failed: Rate limit exceeded",
          error: {
            errorType: "rate_limit",
            errorCode: "rate_limit_exceeded",
          },
        };
      }
    }

    return {
      success: false,
      message: `Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      error: {
        errorType: "unknown",
      },
    };
  }
}

export async function getApiKey(): Promise<string | null> {
  try {
    const result = await db
      .select({
        apiKey: llmConfig.apiKey,
      })
      .from(llmConfig)
      .where(eq(llmConfig.id, 1))
      .limit(1);

    if (result.length === 0 || !result[0]) {
      return null;
    }

    return result[0].apiKey;
  } catch (error) {
    logger.error({ error }, "Failed to retrieve API key");
    throw new Error("Failed to retrieve API key");
  }
}
