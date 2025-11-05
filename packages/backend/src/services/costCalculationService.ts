export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  inputPriceUSD: number,
  outputPriceUSD: number,
  exchangeRate: number,
): number {
  const inputCostUSD = inputTokens * inputPriceUSD;
  const outputCostUSD = outputTokens * outputPriceUSD;
  const totalCostUSD = inputCostUSD + outputCostUSD;
  const totalCostGBP = totalCostUSD * exchangeRate;

  return Number(totalCostGBP.toFixed(2));
}
