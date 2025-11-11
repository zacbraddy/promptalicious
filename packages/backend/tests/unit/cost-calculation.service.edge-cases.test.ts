import { describe, it, expect } from "vitest";

import { calculateCost } from "@/services/cost-calculation.service";

describe("costCalculationService - edge cases", () => {
  describe("calculateCost - precision and extreme values", () => {
    it("should handle very large token counts without overflow", () => {
      const inputTokens = 10000000;
      const outputTokens = 10000000;
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

      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe("number");
      expect(Number.isFinite(result)).toBe(true);
    });

    it("should handle very small prices accurately", () => {
      const inputTokens = 1000;
      const outputTokens = 1000;
      const inputPriceUSD = 0.000000001;
      const outputPriceUSD = 0.000000001;
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

    it("should handle exchange rate of 1.0 correctly", () => {
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
      expect(result).toBe(Number(expectedCostUSD.toFixed(6)));
    });

    it("should handle very high exchange rates", () => {
      const inputTokens = 1000;
      const outputTokens = 500;
      const inputPriceUSD = 0.00015;
      const outputPriceUSD = 0.0006;
      const exchangeRate = 100.0;

      const result = calculateCost(
        inputTokens,
        outputTokens,
        inputPriceUSD,
        outputPriceUSD,
        exchangeRate,
      );

      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe("number");
    });

    it("should handle very low exchange rates", () => {
      const inputTokens = 1000;
      const outputTokens = 500;
      const inputPriceUSD = 0.00015;
      const outputPriceUSD = 0.0006;
      const exchangeRate = 0.01;

      const result = calculateCost(
        inputTokens,
        outputTokens,
        inputPriceUSD,
        outputPriceUSD,
        exchangeRate,
      );

      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe("number");
    });

    it("should handle input-only cost (no output tokens)", () => {
      const inputTokens = 5000;
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
      expect(result).toBe(Number(expectedCost.toFixed(6)));
    });

    it("should handle output-only cost (no input tokens)", () => {
      const inputTokens = 0;
      const outputTokens = 5000;
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
      expect(result).toBe(Number(expectedCost.toFixed(6)));
    });

    it("should handle maximum realistic token count", () => {
      const inputTokens = 1000000;
      const outputTokens = 1000000;
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

      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe("number");
      expect(Number.isFinite(result)).toBe(true);
    });

    it("should maintain precision with repeating decimals", () => {
      const inputTokens = 333;
      const outputTokens = 666;
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

      expect(typeof result).toBe("number");
      expect(result).toBeGreaterThan(0);

      const decimalPlaces = (result.toString().split(".")[1] || "").length;
      expect(decimalPlaces).toBeLessThanOrEqual(6);
    });

    it("should handle asymmetric token counts (much more output than input)", () => {
      const inputTokens = 10;
      const outputTokens = 100000;
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
      expect(result).toBe(Number(expectedCost.toFixed(6)));
    });

    it("should handle asymmetric token counts (much more input than output)", () => {
      const inputTokens = 100000;
      const outputTokens = 10;
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
      expect(result).toBe(Number(expectedCost.toFixed(6)));
    });

    it("should ensure precision loss doesn't create negative costs", () => {
      const inputTokens = 1;
      const outputTokens = 1;
      const inputPriceUSD = 0.0000000001;
      const outputPriceUSD = 0.0000000001;
      const exchangeRate = 0.79;

      const result = calculateCost(
        inputTokens,
        outputTokens,
        inputPriceUSD,
        outputPriceUSD,
        exchangeRate,
      );

      expect(result).toBeGreaterThanOrEqual(0);
    });

    it("should handle realistic GPT-4o-mini pricing precisely", () => {
      const inputTokens = 12345;
      const outputTokens = 67890;
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

      const expectedCostUSD =
        (inputTokens * inputPricePerMillionUSD) / 1000000 +
        (outputTokens * outputPricePerMillionUSD) / 1000000;
      const expectedCostGBP = Number(
        (expectedCostUSD * exchangeRate).toFixed(6),
      );

      expect(result).toBe(expectedCostGBP);
    });

    it("should handle cost calculation that rounds to exactly zero", () => {
      const inputTokens = 0;
      const outputTokens = 0;
      const inputPriceUSD = 999999;
      const outputPriceUSD = 999999;
      const exchangeRate = 999999;

      const result = calculateCost(
        inputTokens,
        outputTokens,
        inputPriceUSD,
        outputPriceUSD,
        exchangeRate,
      );

      expect(result).toBe(0);
    });
  });
});
