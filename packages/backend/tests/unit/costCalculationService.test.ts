import { describe, it, expect } from "vitest";

import { calculateCost } from "@/services/costCalculationService";

describe("costCalculationService", () => {
  describe("calculateCost", () => {
    it("should calculate cost correctly for given inputs", () => {
      const inputTokens = 1000;
      const outputTokens = 500;
      const inputPriceUSD = 0.00015;
      const outputPriceUSD = 0.0006;
      const exchangeRate = 0.79;

      const result = calculateCost(
        inputTokens,
        outputTokens,
        inputPriceUSD,
        outputPriceUSD,
        exchangeRate,
      );

      const expectedCost =
        (inputTokens * inputPriceUSD + outputTokens * outputPriceUSD) *
        exchangeRate;
      expect(result).toBe(Number(expectedCost.toFixed(2)));
    });

    it("should round to 2 decimal places", () => {
      const inputTokens = 123;
      const outputTokens = 456;
      const inputPriceUSD = 0.00015;
      const outputPriceUSD = 0.0006;
      const exchangeRate = 0.79;

      const result = calculateCost(
        inputTokens,
        outputTokens,
        inputPriceUSD,
        outputPriceUSD,
        exchangeRate,
      );

      const decimalPlaces = (result.toString().split(".")[1] || "").length;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });

    it("should handle zero input tokens", () => {
      const inputTokens = 0;
      const outputTokens = 500;
      const inputPriceUSD = 0.00015;
      const outputPriceUSD = 0.0006;
      const exchangeRate = 0.79;

      const result = calculateCost(
        inputTokens,
        outputTokens,
        inputPriceUSD,
        outputPriceUSD,
        exchangeRate,
      );

      const expectedCost = outputTokens * outputPriceUSD * exchangeRate;
      expect(result).toBe(Number(expectedCost.toFixed(2)));
    });

    it("should handle zero output tokens", () => {
      const inputTokens = 1000;
      const outputTokens = 0;
      const inputPriceUSD = 0.00015;
      const outputPriceUSD = 0.0006;
      const exchangeRate = 0.79;

      const result = calculateCost(
        inputTokens,
        outputTokens,
        inputPriceUSD,
        outputPriceUSD,
        exchangeRate,
      );

      const expectedCost = inputTokens * inputPriceUSD * exchangeRate;
      expect(result).toBe(Number(expectedCost.toFixed(2)));
    });

    it("should return 0 when both token counts are zero", () => {
      const inputTokens = 0;
      const outputTokens = 0;
      const inputPriceUSD = 0.00015;
      const outputPriceUSD = 0.0006;
      const exchangeRate = 0.79;

      const result = calculateCost(
        inputTokens,
        outputTokens,
        inputPriceUSD,
        outputPriceUSD,
        exchangeRate,
      );

      expect(result).toBe(0);
    });

    it("should handle very small token counts", () => {
      const inputTokens = 1;
      const outputTokens = 1;
      const inputPriceUSD = 0.00015;
      const outputPriceUSD = 0.0006;
      const exchangeRate = 0.79;

      const result = calculateCost(
        inputTokens,
        outputTokens,
        inputPriceUSD,
        outputPriceUSD,
        exchangeRate,
      );

      expect(result).toBeGreaterThanOrEqual(0);
      expect(typeof result).toBe("number");
    });

    it("should handle large token counts", () => {
      const inputTokens = 100000;
      const outputTokens = 50000;
      const inputPriceUSD = 0.00015;
      const outputPriceUSD = 0.0006;
      const exchangeRate = 0.79;

      const result = calculateCost(
        inputTokens,
        outputTokens,
        inputPriceUSD,
        outputPriceUSD,
        exchangeRate,
      );

      const expectedCost =
        (inputTokens * inputPriceUSD + outputTokens * outputPriceUSD) *
        exchangeRate;
      expect(result).toBe(Number(expectedCost.toFixed(2)));
    });

    it("should handle different exchange rates", () => {
      const inputTokens = 1000;
      const outputTokens = 500;
      const inputPriceUSD = 0.00015;
      const outputPriceUSD = 0.0006;
      const exchangeRate = 1.0;

      const result = calculateCost(
        inputTokens,
        outputTokens,
        inputPriceUSD,
        outputPriceUSD,
        exchangeRate,
      );

      const expectedCostUSD =
        inputTokens * inputPriceUSD + outputTokens * outputPriceUSD;
      expect(result).toBe(Number(expectedCostUSD.toFixed(2)));
    });

    it("should calculate cost accurately with GPT-4o-mini pricing", () => {
      const inputTokens = 1000000;
      const outputTokens = 1000000;
      const inputPricePerMillionUSD = 0.15;
      const outputPricePerMillionUSD = 0.6;
      const inputPricePerTokenUSD = inputPricePerMillionUSD / 1000000;
      const outputPricePerTokenUSD = outputPricePerMillionUSD / 1000000;
      const exchangeRate = 0.79;

      const result = calculateCost(
        inputTokens,
        outputTokens,
        inputPricePerTokenUSD,
        outputPricePerTokenUSD,
        exchangeRate,
      );

      const expectedCost =
        (inputPricePerMillionUSD + outputPricePerMillionUSD) * exchangeRate;
      expect(result).toBe(Number(expectedCost.toFixed(2)));
    });

    it("should handle rounding edge cases correctly", () => {
      const inputTokens = 333;
      const outputTokens = 333;
      const inputPriceUSD = 0.0001;
      const outputPriceUSD = 0.0003;
      const exchangeRate = 0.79;

      const result = calculateCost(
        inputTokens,
        outputTokens,
        inputPriceUSD,
        outputPriceUSD,
        exchangeRate,
      );

      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThanOrEqual(0);
      const resultString = result.toString();
      if (resultString.includes(".")) {
        const decimalPlaces = resultString.split(".")[1]?.length ?? 0;
        expect(decimalPlaces).toBeLessThanOrEqual(2);
      }
    });
  });
});
