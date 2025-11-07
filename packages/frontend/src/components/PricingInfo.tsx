import type { PricingInfoResponse } from "@promptalicious/shared-infra";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export interface PricingInfoProps {
  pricingData: PricingInfoResponse;
}

export function PricingInfo({ pricingData }: PricingInfoProps) {
  const { pricing, exchangeRate } = pricingData;

  const formatPrice = (priceUSD: number): string => {
    const priceGBP = priceUSD * exchangeRate.rate;
    return `$${priceUSD.toFixed(6)} USD (£${priceGBP.toFixed(6)} GBP)`;
  };

  const formatDate = (isoDateString: string): string => {
    const date = new Date(isoDateString);
    return date.toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pricing Information</CardTitle>
        <CardDescription>
          Current token pricing for {pricing.model} ({pricing.provider})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-[140px_1fr] gap-2">
            <div className="font-medium">Model:</div>
            <div>{pricing.model}</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-2">
            <div className="font-medium">Provider:</div>
            <div>{pricing.provider}</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-2">
            <div className="font-medium">Input Tokens:</div>
            <div>{formatPrice(pricing.inputTokenPriceUSD)} per token</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-2">
            <div className="font-medium">Output Tokens:</div>
            <div>{formatPrice(pricing.outputTokenPriceUSD)} per token</div>
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-2">
            <div className="font-medium">Exchange Rate:</div>
            <div>
              1 {exchangeRate.fromCurrency} = {exchangeRate.rate.toFixed(4)}{" "}
              {exchangeRate.toCurrency}
            </div>
          </div>

          <div className="grid grid-cols-[140px_1fr] gap-2">
            <div className="font-medium">Last Updated:</div>
            <div>{formatDate(pricing.lastUpdated)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
