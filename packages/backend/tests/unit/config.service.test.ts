import { describe, it, expect, vi, beforeEach } from "vitest";

import * as configService from "@/services/config.service";
import { db } from "@/db/connection";

vi.mock("@/db/connection", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(),
}));

vi.mock("../../src/lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("configService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getConfig", () => {
    it("should return configuration when it exists", async () => {
      const mockConfig = {
        id: 1,
        selectedModel: "gpt-4o-mini",
        baseURL: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockConfig]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      const result = await configService.getConfig();

      expect(result).toEqual(mockConfig);
      expect(db.select).toHaveBeenCalled();
    });

    it("should return null when configuration does not exist", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      const result = await configService.getConfig();

      expect(result).toBeNull();
    });

    it("should throw error when database query fails", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error("Database error")),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      await expect(configService.getConfig()).rejects.toThrow(
        "Failed to retrieve configuration",
      );
    });
  });

  describe("updateConfig", () => {
    it("should update existing configuration", async () => {
      const mockExistingConfig = {
        id: 1,
        selectedModel: "gpt-4o-mini",
        baseURL: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedConfig = {
        ...mockExistingConfig,
        selectedModel: "gpt-4o",
        updatedAt: new Date(),
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockExistingConfig]),
      };

      const mockUpdateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockUpdatedConfig]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);
      vi.mocked(db.update).mockReturnValue(mockUpdateChain as never);

      const result = await configService.updateConfig({
        selectedModel: "gpt-4o",
      });

      expect(result.selectedModel).toBe("gpt-4o");
      expect(db.update).toHaveBeenCalled();
    });

    it("should insert new configuration when none exists", async () => {
      const mockNewConfig = {
        id: 1,
        selectedModel: "gpt-4o-mini",
        baseURL: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const mockInsertChain = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockNewConfig]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);
      vi.mocked(db.insert).mockReturnValue(mockInsertChain as never);

      const result = await configService.updateConfig({
        apiKey: "test-key",
      });

      expect(result.id).toBe(1);
      expect(db.insert).toHaveBeenCalled();
    });

    it("should throw error when update returns no result", async () => {
      const mockExistingConfig = {
        id: 1,
        selectedModel: "gpt-4o-mini",
        baseURL: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockExistingConfig]),
      };

      const mockUpdateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);
      vi.mocked(db.update).mockReturnValue(mockUpdateChain as never);

      await expect(
        configService.updateConfig({
          selectedModel: "gpt-4o",
        }),
      ).rejects.toThrow("Failed to update configuration");
    });
  });

  describe("testConnection", () => {
    it("should return success when connection test passes", async () => {
      const { generateText } = await import("ai");
      const { createOpenAI } = await import("@ai-sdk/openai");

      const mockProvider = vi.fn();
      vi.mocked(createOpenAI).mockReturnValue(mockProvider as never);
      vi.mocked(generateText).mockResolvedValue({
        text: "OK",
      } as never);

      const result = await configService.testConnection(
        "test-key",
        "gpt-4o-mini",
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("Successfully connected");
    });

    it("should return authentication error for invalid API key", async () => {
      const { generateText } = await import("ai");
      const { createOpenAI } = await import("@ai-sdk/openai");

      const mockProvider = vi.fn();
      vi.mocked(createOpenAI).mockReturnValue(mockProvider as never);
      vi.mocked(generateText).mockRejectedValue(
        new Error("401 Unauthorized: Invalid API key"),
      );

      const result = await configService.testConnection(
        "invalid-key",
        "gpt-4o-mini",
      );

      expect(result.success).toBe(false);
      expect(result.error?.errorType).toBe("authentication");
      expect(result.error?.errorCode).toBe("invalid_api_key");
    });

    it("should return network error for connection failures", async () => {
      const { generateText } = await import("ai");
      const { createOpenAI } = await import("@ai-sdk/openai");

      const mockProvider = vi.fn();
      vi.mocked(createOpenAI).mockReturnValue(mockProvider as never);
      vi.mocked(generateText).mockRejectedValue(new Error("ECONNREFUSED"));

      const result = await configService.testConnection(
        "test-key",
        "gpt-4o-mini",
      );

      expect(result.success).toBe(false);
      expect(result.error?.errorType).toBe("network");
    });

    it("should return rate limit error when rate limited", async () => {
      const { generateText } = await import("ai");
      const { createOpenAI } = await import("@ai-sdk/openai");

      const mockProvider = vi.fn();
      vi.mocked(createOpenAI).mockReturnValue(mockProvider as never);
      vi.mocked(generateText).mockRejectedValue(
        new Error("429 Too Many Requests: Rate limit exceeded"),
      );

      const result = await configService.testConnection(
        "test-key",
        "gpt-4o-mini",
      );

      expect(result.success).toBe(false);
      expect(result.error?.errorType).toBe("rate_limit");
      expect(result.error?.errorCode).toBe("rate_limit_exceeded");
    });
  });

  describe("getApiKey", () => {
    it("should return API key when configuration exists", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ apiKey: "test-key-123" }]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      const result = await configService.getApiKey();

      expect(result).toBe("test-key-123");
    });

    it("should return null when configuration does not exist", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      const result = await configService.getApiKey();

      expect(result).toBeNull();
    });

    it("should throw error when database query fails", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error("Database error")),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      await expect(configService.getApiKey()).rejects.toThrow(
        "Failed to retrieve API key",
      );
    });
  });
});
