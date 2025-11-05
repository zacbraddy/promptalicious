import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

import * as pricingService from "../../src/services/pricingService.js";
import { db } from "../../src/db/connection.js";

vi.mock("axios");

vi.mock("../../src/db/connection.js", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("../../src/lib/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("pricingService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchPricingData", () => {
    it("should successfully scrape pricing data from OpenAI", async () => {
      const mockHtml = `
        <html>
          <body>
            <div>
              <h3>GPT-4o mini</h3>
              <p>$0.150 / 1M input tokens</p>
              <p>$0.600 / 1M output tokens</p>
            </div>
          </body>
        </html>
      `;

      vi.mocked(axios.get).mockResolvedValue({
        data: mockHtml,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      });

      const result = await pricingService.fetchPricingData();

      expect(result).toEqual({
        inputTokenPriceUsd: 0.00000015,
        outputTokenPriceUsd: 0.0000006,
      });
      expect(axios.get).toHaveBeenCalledWith(
        "https://openai.com/api/pricing/",
        expect.objectContaining({
          timeout: 10000,
        }),
      );
    });

    it("should fall back to hardcoded values when scraping fails", async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error("Network error"));

      const result = await pricingService.fetchPricingData();

      expect(result).toEqual({
        inputTokenPriceUsd: 0.00000015,
        outputTokenPriceUsd: 0.0000006,
      });
    });

    it("should fall back to hardcoded values when pricing data not found in HTML", async () => {
      const mockHtml = `
        <html>
          <body>
            <div>
              <h3>Some other model</h3>
              <p>No pricing here</p>
            </div>
          </body>
        </html>
      `;

      vi.mocked(axios.get).mockResolvedValue({
        data: mockHtml,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      });

      const result = await pricingService.fetchPricingData();

      expect(result).toEqual({
        inputTokenPriceUsd: 0.00000015,
        outputTokenPriceUsd: 0.0000006,
      });
    });

    it("should handle timeout errors", async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error("timeout of 10000ms exceeded"));

      const result = await pricingService.fetchPricingData();

      expect(result).toEqual({
        inputTokenPriceUsd: 0.00000015,
        outputTokenPriceUsd: 0.0000006,
      });
    });
  });

  describe("cachePricingData", () => {
    it("should insert new pricing data when no existing data", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const mockInsertChain = {
        values: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);
      vi.mocked(db.insert).mockReturnValue(mockInsertChain as never);

      await pricingService.cachePricingData(0.00000015, 0.0000006);

      expect(db.select).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
      expect(mockInsertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "gpt-4o-mini",
          provider: "openai",
          inputTokenPriceUsd: "0.0000001500",
          outputTokenPriceUsd: "0.0000006000",
        }),
      );
    });

    it("should update existing pricing data when data exists", async () => {
      const mockExistingPricing = {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUsd: "0.0000001",
        outputTokenPriceUsd: "0.0000005",
        lastUpdated: new Date(),
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockExistingPricing]),
      };

      const mockUpdateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);
      vi.mocked(db.update).mockReturnValue(mockUpdateChain as never);

      await pricingService.cachePricingData(0.00000015, 0.0000006);

      expect(db.select).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
      expect(mockUpdateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          inputTokenPriceUsd: "0.0000001500",
          outputTokenPriceUsd: "0.0000006000",
        }),
      );
    });

    it("should throw error when database operation fails", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error("Database error")),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      await expect(
        pricingService.cachePricingData(0.00000015, 0.0000006),
      ).rejects.toThrow("Failed to cache pricing data");
    });
  });

  describe("getPricingData", () => {
    it("should return pricing data with staleness information", async () => {
      const mockPricing = {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUsd: "0.00000015",
        outputTokenPriceUsd: "0.0000006",
        lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockPricing]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      const result = await pricingService.getPricingData();

      expect(result).toMatchObject({
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUsd: "0.00000015",
        outputTokenPriceUsd: "0.0000006",
        isStale: false,
        daysSinceUpdate: 3,
      });
    });

    it("should mark pricing as stale when older than 7 days", async () => {
      const mockPricing = {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUsd: "0.00000015",
        outputTokenPriceUsd: "0.0000006",
        lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockPricing]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      const result = await pricingService.getPricingData();

      expect(result).toMatchObject({
        isStale: true,
        daysSinceUpdate: 10,
      });
    });

    it("should return null when no pricing data exists", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      const result = await pricingService.getPricingData();

      expect(result).toBeNull();
    });

    it("should throw error when database query fails", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error("Database error")),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      await expect(pricingService.getPricingData()).rejects.toThrow(
        "Failed to retrieve pricing data",
      );
    });
  });

  describe("initializePricingCache", () => {
    it("should skip initialization when fresh cache exists", async () => {
      const mockFreshPricing = {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUsd: "0.00000015",
        outputTokenPriceUsd: "0.0000006",
        lastUpdated: new Date(),
        isStale: false,
        daysSinceUpdate: 0,
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockFreshPricing]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      await pricingService.initializePricingCache();

      expect(axios.get).not.toHaveBeenCalled();
    });

    it("should fetch and cache pricing when no cache exists", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const mockInsertChain = {
        values: vi.fn().mockResolvedValue(undefined),
      };

      const mockHtml = `
        <html>
          <body>
            <div>
              <h3>GPT-4o mini</h3>
              <p>$0.150 / 1M input tokens</p>
              <p>$0.600 / 1M output tokens</p>
            </div>
          </body>
        </html>
      `;

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);
      vi.mocked(db.insert).mockReturnValue(mockInsertChain as never);
      vi.mocked(axios.get).mockResolvedValue({
        data: mockHtml,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      });

      await pricingService.initializePricingCache();

      expect(axios.get).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });

    it("should fetch and cache pricing when cache is stale", async () => {
      const mockStalePricing = {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUsd: "0.00000015",
        outputTokenPriceUsd: "0.0000006",
        lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        isStale: true,
        daysSinceUpdate: 10,
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockStalePricing]),
      };

      const mockUpdateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      const mockHtml = `
        <html>
          <body>
            <div>
              <h3>GPT-4o mini</h3>
              <p>$0.150 / 1M input tokens</p>
              <p>$0.600 / 1M output tokens</p>
            </div>
          </body>
        </html>
      `;

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);
      vi.mocked(db.update).mockReturnValue(mockUpdateChain as never);
      vi.mocked(axios.get).mockResolvedValue({
        data: mockHtml,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      });

      await pricingService.initializePricingCache();

      expect(axios.get).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
    });

    it("should handle initialization failure gracefully when cache exists", async () => {
      const mockStalePricing = {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUsd: "0.00000015",
        outputTokenPriceUsd: "0.0000006",
        lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        isStale: true,
        daysSinceUpdate: 10,
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValueOnce([mockStalePricing])
          .mockResolvedValueOnce([mockStalePricing]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);
      vi.mocked(axios.get).mockRejectedValue(new Error("Network error"));

      await pricingService.initializePricingCache();

      expect(axios.get).toHaveBeenCalled();
    });
  });
});
