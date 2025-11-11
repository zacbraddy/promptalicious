import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";

import * as exchangeRateService from "@/services/exchange-rate.service";
import { db } from "@/db/connection";

vi.mock("axios");

vi.mock("@/db/connection", () => ({
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

describe("exchangeRateService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchExchangeRate", () => {
    it("should successfully fetch USD→GBP exchange rate from Frankfurter API", async () => {
      const mockApiResponse = {
        amount: 1.0,
        base: "USD",
        date: "2025-11-04",
        rates: {
          GBP: 0.79,
        },
      };

      vi.mocked(axios.get).mockResolvedValue({
        data: mockApiResponse,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      });

      const result = await exchangeRateService.fetchExchangeRate();

      expect(result).toBe(0.79);
      expect(axios.get).toHaveBeenCalledWith(
        "https://api.frankfurter.dev/v1/latest?base=USD&symbols=GBP",
        expect.objectContaining({
          timeout: 10000,
        }),
      );
    });

    it("should throw error when API call fails", async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error("Network error"));

      await expect(exchangeRateService.fetchExchangeRate()).rejects.toThrow(
        "Network error",
      );
    });

    it("should throw error when API returns invalid rate", async () => {
      const mockApiResponse = {
        amount: 1.0,
        base: "USD",
        date: "2025-11-04",
        rates: {
          GBP: -0.5, // Invalid negative rate
        },
      };

      vi.mocked(axios.get).mockResolvedValue({
        data: mockApiResponse,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      });

      await expect(exchangeRateService.fetchExchangeRate()).rejects.toThrow(
        "Invalid exchange rate returned from API",
      );
    });

    it("should throw error when API returns zero rate", async () => {
      const mockApiResponse = {
        amount: 1.0,
        base: "USD",
        date: "2025-11-04",
        rates: {
          GBP: 0, // Invalid zero rate
        },
      };

      vi.mocked(axios.get).mockResolvedValue({
        data: mockApiResponse,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      });

      await expect(exchangeRateService.fetchExchangeRate()).rejects.toThrow(
        "Invalid exchange rate returned from API",
      );
    });

    it("should handle timeout errors", async () => {
      vi.mocked(axios.get).mockRejectedValue(
        new Error("timeout of 10000ms exceeded"),
      );

      await expect(exchangeRateService.fetchExchangeRate()).rejects.toThrow(
        "timeout of 10000ms exceeded",
      );
    });
  });

  describe("cacheExchangeRate", () => {
    it("should insert new exchange rate when no existing data", async () => {
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

      await exchangeRateService.cacheExchangeRate(0.79);

      expect(db.select).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
      expect(mockInsertChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          fromCurrency: "USD",
          toCurrency: "GBP",
          rate: "0.790000",
        }),
      );
    });

    it("should update existing exchange rate when data exists", async () => {
      const mockExistingRate = {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: "0.75",
        lastUpdated: new Date(),
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockExistingRate]),
      };

      const mockUpdateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);
      vi.mocked(db.update).mockReturnValue(mockUpdateChain as never);

      await exchangeRateService.cacheExchangeRate(0.79);

      expect(db.select).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
      expect(mockUpdateChain.set).toHaveBeenCalledWith(
        expect.objectContaining({
          rate: "0.790000",
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

      await expect(exchangeRateService.cacheExchangeRate(0.79)).rejects.toThrow(
        "Failed to cache exchange rate",
      );
    });
  });

  describe("getExchangeRate", () => {
    it("should return exchange rate data with staleness information", async () => {
      const mockRate = {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: "0.79",
        lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockRate]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      const result = await exchangeRateService.getExchangeRate();

      expect(result).toMatchObject({
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: 0.79,
        isStale: false,
        daysSinceUpdate: 3,
      });
    });

    it("should mark exchange rate as stale when older than 7 days", async () => {
      const mockRate = {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: "0.79",
        lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockRate]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      const result = await exchangeRateService.getExchangeRate();

      expect(result).toMatchObject({
        isStale: true,
        daysSinceUpdate: 10,
      });
    });

    it("should return null when no exchange rate data exists", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      const result = await exchangeRateService.getExchangeRate();

      expect(result).toBeNull();
    });

    it("should throw error when database query fails", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockRejectedValue(new Error("Database error")),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      await expect(exchangeRateService.getExchangeRate()).rejects.toThrow(
        "Failed to retrieve exchange rate",
      );
    });
  });

  describe("initializeExchangeRateCache", () => {
    it("should skip initialization when fresh cache exists", async () => {
      const mockFreshRate = {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: "0.79",
        lastUpdated: new Date(),
        isStale: false,
        daysSinceUpdate: 0,
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockFreshRate]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);

      await exchangeRateService.initializeExchangeRateCache();

      expect(axios.get).not.toHaveBeenCalled();
    });

    it("should fetch and cache exchange rate when no cache exists", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      const mockInsertChain = {
        values: vi.fn().mockResolvedValue(undefined),
      };

      const mockApiResponse = {
        amount: 1.0,
        base: "USD",
        date: "2025-11-04",
        rates: {
          GBP: 0.79,
        },
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);
      vi.mocked(db.insert).mockReturnValue(mockInsertChain as never);
      vi.mocked(axios.get).mockResolvedValue({
        data: mockApiResponse,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      });

      await exchangeRateService.initializeExchangeRateCache();

      expect(axios.get).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled();
    });

    it("should fetch and cache exchange rate when cache is stale", async () => {
      const mockStaleRate = {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: "0.75",
        lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        isStale: true,
        daysSinceUpdate: 10,
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockStaleRate]),
      };

      const mockUpdateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };

      const mockApiResponse = {
        amount: 1.0,
        base: "USD",
        date: "2025-11-04",
        rates: {
          GBP: 0.79,
        },
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);
      vi.mocked(db.update).mockReturnValue(mockUpdateChain as never);
      vi.mocked(axios.get).mockResolvedValue({
        data: mockApiResponse,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      });

      await exchangeRateService.initializeExchangeRateCache();

      expect(axios.get).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
    });

    it("should handle initialization failure gracefully when cache exists", async () => {
      const mockStaleRate = {
        id: 1,
        fromCurrency: "USD",
        toCurrency: "GBP",
        rate: "0.75",
        lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        isStale: true,
        daysSinceUpdate: 10,
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValueOnce([mockStaleRate])
          .mockResolvedValueOnce([mockStaleRate]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);
      vi.mocked(axios.get).mockRejectedValue(new Error("Network error"));

      await exchangeRateService.initializeExchangeRateCache();

      expect(axios.get).toHaveBeenCalled();
    });

    it("should handle initialization failure gracefully when no cache exists", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      vi.mocked(db.select).mockReturnValue(mockSelectChain as never);
      vi.mocked(axios.get).mockRejectedValue(new Error("Network error"));

      await exchangeRateService.initializeExchangeRateCache();

      expect(axios.get).toHaveBeenCalled();
    });
  });
});
