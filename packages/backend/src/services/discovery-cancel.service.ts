import * as fs from "fs/promises";

import {
  acknowledgeCancellation,
  getCurrentStatus,
  requestCancellation,
} from "@/services/discovery-status.service";
import { db } from "@/db/connection";
import { tools } from "@/db/schema";

export interface CancellationResult {
  cancelled: boolean;
  message: string;
}

const DEFAULT_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 100;

export async function cancelDiscovery(
  workspacePath: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<CancellationResult> {
  const status = getCurrentStatus();

  if (!status.isDiscovering) {
    return {
      cancelled: false,
      message: "No discovery in progress",
    };
  }

  requestCancellation();

  const startTime = Date.now();
  let discovered = false;

  while (Date.now() - startTime < timeoutMs) {
    const currentStatus = getCurrentStatus();

    if (!currentStatus.isDiscovering) {
      discovered = true;
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  if (!discovered) {
    return {
      cancelled: false,
      message:
        "Discovery cancellation timed out - discovery did not acknowledge abort",
    };
  }

  try {
    await fs.rm(workspacePath, { recursive: true, force: true });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown filesystem error";
    return {
      cancelled: false,
      message: `Failed to clean up workspace: ${errorMessage}`,
    };
  }

  try {
    await db.delete(tools).execute();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown database error";
    return {
      cancelled: false,
      message: `Failed to clean up database: ${errorMessage}`,
    };
  }

  acknowledgeCancellation();

  return {
    cancelled: true,
    message: "Discovery cancelled successfully, workspace cleaned up",
  };
}
