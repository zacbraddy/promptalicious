import { describe, it, expect, vi, beforeEach } from "vitest";

import * as pricingService from "@/services/pricing.service";
import { db } from "@/db/connection";

vi.mock("@/db/connection", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("pricingService - staleness edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPricingData - staleness boundary cases", () => {
    it("should mark pricing as fresh when exactly 7 days old", async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const mockPricing = {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUsd: "0.00000015",
        outputTokenPriceUsd: "0.0000006",
        lastUpdated: sevenDaysAgo,
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockPricing]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      const result = await pricingService.getPricingData();

      expect(result).toMatchObject({
        isStale: false,
        daysSinceUpdate: 7,
      });
    });

    it("should mark pricing as stale when exactly 8 days old", async () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

      const mockPricing = {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUsd: "0.00000015",
        outputTokenPriceUsd: "0.0000006",
        lastUpdated: eightDaysAgo,
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
        daysSinceUpdate: 8,
      });
    });

    it("should mark pricing as fresh when updated today", async () => {
      const today = new Date();

      const mockPricing = {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUsd: "0.00000015",
        outputTokenPriceUsd: "0.0000006",
        lastUpdated: today,
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockPricing]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      const result = await pricingService.getPricingData();

      expect(result).toMatchObject({
        isStale: false,
        daysSinceUpdate: 0,
      });
    });

    it("should mark pricing as fresh when updated 1 minute ago", async () => {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

      const mockPricing = {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUsd: "0.00000015",
        outputTokenPriceUsd: "0.0000006",
        lastUpdated: oneMinuteAgo,
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockPricing]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      const result = await pricingService.getPricingData();

      expect(result).toMatchObject({
        isStale: false,
        daysSinceUpdate: 0,
      });
    });

    it("should mark pricing as stale when 30 days old", async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const mockPricing = {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUsd: "0.00000015",
        outputTokenPriceUsd: "0.0000006",
        lastUpdated: thirtyDaysAgo,
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
        daysSinceUpdate: 30,
      });
    });

    it("should mark pricing as stale when 365 days old (1 year)", async () => {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

      const mockPricing = {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUsd: "0.00000015",
        outputTokenPriceUsd: "0.0000006",
        lastUpdated: oneYearAgo,
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
        daysSinceUpdate: 365,
      });
    });

    it("should handle fractional days correctly (23 hours is 0 days)", async () => {
      const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);

      const mockPricing = {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUsd: "0.00000015",
        outputTokenPriceUsd: "0.0000006",
        lastUpdated: twentyThreeHoursAgo,
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockPricing]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      const result = await pricingService.getPricingData();

      expect(result).toMatchObject({
        isStale: false,
        daysSinceUpdate: 0,
      });
    });

    it("should handle fractional days correctly (25 hours is 1 day)", async () => {
      const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

      const mockPricing = {
        id: 1,
        model: "gpt-4o-mini",
        provider: "openai",
        inputTokenPriceUsd: "0.00000015",
        outputTokenPriceUsd: "0.0000006",
        lastUpdated: twentyFiveHoursAgo,
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockPricing]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      const result = await pricingService.getPricingData();

      expect(result).toMatchObject({
        isStale: false,
        daysSinceUpdate: 1,
      });
    });
  });
});
