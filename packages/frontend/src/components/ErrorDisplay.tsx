import { Link } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  Ban,
  Clock,
  Lock,
  TrendingUp,
  Wifi,
  XCircle,
} from "lucide-react";
import type { ExecutionError } from "@promptalicious/shared-infra";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorDisplayProps {
  error: ExecutionError;
}

const ERROR_ICONS = {
  authentication: Lock,
  network: Wifi,
  timeout: Clock,
  rate_limit: TrendingUp,
  validation: AlertTriangle,
  aborted: Ban,
  api_error: XCircle,
  unknown: AlertCircle,
} as const;

const getErrorTitle = (errorType: ExecutionError["errorType"]) => {
  switch (errorType) {
    case "authentication":
      return "Authentication Error";
    case "network":
      return "Network Error";
    case "timeout":
      return "Request Timeout";
    case "rate_limit":
      return "Rate Limit Exceeded";
    case "validation":
      return "Validation Error";
    case "aborted":
      return "Execution Cancelled";
    case "api_error":
      return "API Error";
    case "unknown":
    default:
      return "Unknown Error";
  }
};

const getActionableGuidance = (errorType: ExecutionError["errorType"]) => {
  switch (errorType) {
    case "authentication":
      return (
        <p className="text-sm leading-relaxed text-destructive/90">
          Please check your API credentials in{" "}
          <Link
            to="/settings"
            className="underline underline-offset-2 hover:text-primary font-medium"
          >
            Settings
          </Link>
          .
        </p>
      );
    case "rate_limit":
      return (
        <p className="text-sm leading-relaxed text-destructive/90">
          You have exceeded the API rate limit. Please wait before trying again.
        </p>
      );
    case "network":
      return (
        <p className="text-sm leading-relaxed text-destructive/90">
          Please check your internet connection and try again.
        </p>
      );
    case "timeout":
      return (
        <p className="text-sm leading-relaxed text-destructive/90">
          The request took too long to complete. Try again with a shorter
          prompt.
        </p>
      );
    case "validation":
      return (
        <p className="text-sm leading-relaxed text-destructive/90">
          Please check your input and ensure all required fields are filled
          correctly.
        </p>
      );
    case "aborted":
      return (
        <p className="text-sm leading-relaxed text-destructive/90">
          The execution was cancelled. You can start a new execution.
        </p>
      );
    default:
      return null;
  }
};

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  const IconComponent = ERROR_ICONS[error.errorType] ?? AlertCircle;
  const title = getErrorTitle(error.errorType);
  const guidance = getActionableGuidance(error.errorType);

  return (
    <Alert variant="destructive" className="mt-4">
      <IconComponent className="h-4 w-4" />
      <AlertTitle className="text-base font-semibold">{title}</AlertTitle>
      <AlertDescription>
        <div className="space-y-3">
          <p className="text-sm leading-relaxed">{error.errorMessage}</p>

          {error.errorCode && (
            <p className="text-xs font-mono text-destructive/80 tracking-wide">
              Error Code: {error.errorCode}
            </p>
          )}

          {error.additionalContext &&
            Object.keys(error.additionalContext).length > 0 && (
              <details className="text-xs mt-2">
                <summary className="cursor-pointer hover:text-primary font-medium">
                  Additional Details
                </summary>
                <pre className="mt-2 p-3 bg-background/50 rounded text-xs font-mono leading-relaxed overflow-x-auto">
                  {JSON.stringify(error.additionalContext, null, 2)}
                </pre>
              </details>
            )}

          {guidance}
        </div>
      </AlertDescription>
    </Alert>
  );
}
