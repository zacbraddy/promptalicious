import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import type {
  ConfigurationResponse,
  UpdateConfigurationRequest,
  UpdateConfigurationSuccessResponse,
  UpdateConfigurationErrorResponse,
  TestConnectionResponse,
} from "@promptalicious/shared-infra";

import app from "../../src/app";
import { db } from "../../src/db/connection";
import { llmConfig } from "../../src/db/schema";

describe("Configuration persistence and validation flow (integration)", () => {
  let originalConfig: typeof llmConfig.$inferSelect | null = null;

  beforeAll(async () => {
    const existingConfig = await db
      .select()
      .from(llmConfig)
      .where(eq(llmConfig.id, 1))
      .limit(1);
    originalConfig = existingConfig[0] || null;
    await cleanupDatabase();
  });

  afterAll(async () => {
    await cleanupDatabase();
    if (originalConfig) {
      await db.insert(llmConfig).values(originalConfig);
    }
  });

  beforeEach(async () => {
    await cleanupDatabase();
  });

  async function cleanupDatabase() {
    try {
      await db.delete(llmConfig).where(eq(llmConfig.id, 1));
    } catch {
      // Ignore cleanup errors
    }
  }

  it("should complete full configuration workflow", async () => {
    const getInitialConfig = await app.request("/api/config", {
      method: "GET",
    });
    const initialConfigData =
      (await getInitialConfig.json()) as ConfigurationResponse;

    expect(getInitialConfig.status).toBe(200);
    expect(initialConfigData.config).toBeDefined();
    expect(initialConfigData.config.selectedModel).toBe("gpt-4o-mini");
    expect(initialConfigData.availableModels).toContain("gpt-4o-mini");

    const existingConfig = await db
      .select()
      .from(llmConfig)
      .where(eq(llmConfig.id, 1))
      .limit(1);

    const hasValidApiKey =
      existingConfig.length > 0 && existingConfig[0]?.apiKey;

    if (!hasValidApiKey || !existingConfig[0]) {
      // eslint-disable-next-line no-console
      console.warn(
        "No valid API key in database - skipping real API validation test",
      );
      return;
    }

    const validApiKey = existingConfig[0].apiKey;

    const putWithValidKey = await app.request("/api/config", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: validApiKey,
      } satisfies UpdateConfigurationRequest),
    });

    const validConfigResponse =
      (await putWithValidKey.json()) as UpdateConfigurationSuccessResponse;

    expect(putWithValidKey.status).toBe(200);
    expect(validConfigResponse.validationResult.success).toBe(true);
    expect(validConfigResponse.validationResult.message).toContain("validated");
    expect(validConfigResponse.config).not.toHaveProperty("apiKey");

    const dbConfig = await db
      .select()
      .from(llmConfig)
      .where(eq(llmConfig.id, 1))
      .limit(1);

    expect(dbConfig).toHaveLength(1);
    expect(dbConfig[0]?.selectedModel).toBe("gpt-4o-mini");
    expect(dbConfig[0]?.apiKey).toBe(validApiKey);

    const testConnectionRes = await app.request("/api/config/test-connection", {
      method: "POST",
    });
    const testConnectionData =
      (await testConnectionRes.json()) as TestConnectionResponse;

    expect(testConnectionRes.status).toBe(200);
    expect(testConnectionData.success).toBe(true);
    expect(testConnectionData.message).toContain("Successfully connected");

    const putWithInvalidKey = await app.request("/api/config", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: "sk-invalid-test-key-12345",
      } satisfies UpdateConfigurationRequest),
    });
    const invalidConfigResponse =
      (await putWithInvalidKey.json()) as UpdateConfigurationErrorResponse;

    expect(putWithInvalidKey.status).toBe(400);
    expect(invalidConfigResponse.error.errorType).toBe("authentication");
    expect(invalidConfigResponse.error.errorMessage).toContain(
      "validation failed",
    );

    const dbConfigAfterInvalid = await db
      .select()
      .from(llmConfig)
      .where(eq(llmConfig.id, 1))
      .limit(1);

    expect(dbConfigAfterInvalid).toHaveLength(1);
    expect(dbConfigAfterInvalid[0]?.apiKey).toBe(validApiKey);
    expect(dbConfigAfterInvalid[0]?.apiKey).not.toBe(
      "sk-invalid-test-key-12345",
    );

    const getFinalConfig = await app.request("/api/config", {
      method: "GET",
    });
    const finalConfigData =
      (await getFinalConfig.json()) as ConfigurationResponse;

    expect(getFinalConfig.status).toBe(200);
    expect(finalConfigData.config).not.toHaveProperty("apiKey");
  });

  it("should handle configuration updates without API key", async () => {
    await db.insert(llmConfig).values({
      id: 1,
      selectedModel: "gpt-4o-mini",
      apiKey: "sk-existing-key",
      providerEndpoint: null,
    });

    const updateModelRes = await app.request("/api/config", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        providerEndpoint: "https://api.openai.com/v1",
      } satisfies UpdateConfigurationRequest),
    });

    expect(updateModelRes.status).toBe(200);
    const updateResponse =
      (await updateModelRes.json()) as UpdateConfigurationSuccessResponse;
    expect(updateResponse.config.providerEndpoint).toBe(
      "https://api.openai.com/v1",
    );
    expect(updateResponse.validationResult.success).toBe(true);

    const dbConfigAfterUpdate = await db
      .select()
      .from(llmConfig)
      .where(eq(llmConfig.id, 1))
      .limit(1);

    expect(dbConfigAfterUpdate).toHaveLength(1);
    expect(dbConfigAfterUpdate[0]?.providerEndpoint).toBe(
      "https://api.openai.com/v1",
    );
    expect(dbConfigAfterUpdate[0]?.apiKey).toBe("sk-existing-key");
  });

  it("should handle test connection when no configuration exists", async () => {
    const testConnectionRes = await app.request("/api/config/test-connection", {
      method: "POST",
    });
    const testConnectionData =
      (await testConnectionRes.json()) as TestConnectionResponse;

    expect(testConnectionRes.status).toBe(400);
    expect(testConnectionData.success).toBe(false);
    expect(
      testConnectionData.message.includes("No configuration found") ||
        testConnectionData.message.includes("No API key configured"),
    ).toBe(true);
    expect(testConnectionData.error?.errorType).toMatch(
      /validation|authentication/,
    );
  });

  it("should persist configuration across multiple requests", async () => {
    const existingConfig = await db
      .select()
      .from(llmConfig)
      .where(eq(llmConfig.id, 1))
      .limit(1);

    const hasValidApiKey =
      existingConfig.length > 0 && existingConfig[0]?.apiKey;

    if (!hasValidApiKey || !existingConfig[0]) {
      // eslint-disable-next-line no-console
      console.warn("No valid API key in database - skipping persistence test");
      return;
    }

    const apiKey = existingConfig[0].apiKey;

    const firstUpdate = await app.request("/api/config", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey,
        selectedModel: "gpt-4o-mini",
      } satisfies UpdateConfigurationRequest),
    });

    expect(firstUpdate.status).toBe(200);

    const getAfterFirst = await app.request("/api/config", {
      method: "GET",
    });
    const firstGet = (await getAfterFirst.json()) as ConfigurationResponse;
    expect(firstGet.config.selectedModel).toBe("gpt-4o-mini");

    const secondUpdate = await app.request("/api/config", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        providerEndpoint: "https://custom.endpoint.com/v1",
      } satisfies UpdateConfigurationRequest),
    });

    expect(secondUpdate.status).toBe(200);

    const getAfterSecond = await app.request("/api/config", {
      method: "GET",
    });
    const secondGet = (await getAfterSecond.json()) as ConfigurationResponse;
    expect(secondGet.config.selectedModel).toBe("gpt-4o-mini");
    expect(secondGet.config.providerEndpoint).toBe(
      "https://custom.endpoint.com/v1",
    );

    const dbFinalConfig = await db
      .select()
      .from(llmConfig)
      .where(eq(llmConfig.id, 1))
      .limit(1);

    expect(dbFinalConfig).toHaveLength(1);
    expect(dbFinalConfig[0]?.selectedModel).toBe("gpt-4o-mini");
    expect(dbFinalConfig[0]?.providerEndpoint).toBe(
      "https://custom.endpoint.com/v1",
    );
    expect(dbFinalConfig[0]?.apiKey).toBe(apiKey);
  });
});
