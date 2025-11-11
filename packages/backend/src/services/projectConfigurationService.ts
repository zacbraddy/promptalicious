import { eq } from "drizzle-orm";

import { db } from "@/db/connection";
import { projectConfiguration } from "@/db/schema";
import { logger } from "@/lib/logger";
import * as discoveryCancelService from "@/services/discovery-cancel-service";
import * as discoveryStatusService from "@/services/discovery-status-service";

export interface ProjectConfigurationData {
  name: string;
  targetProjectPath: string;
}

export interface ProjectConfiguration {
  id: number;
  name: string;
  targetProjectPath: string;
  workspacePath: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getProjectConfiguration(): Promise<ProjectConfiguration | null> {
  try {
    const result = await db
      .select()
      .from(projectConfiguration)
      .where(eq(projectConfiguration.id, 1))
      .limit(1);

    if (result.length === 0 || !result[0]) {
      return null;
    }

    return result[0];
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to retrieve project configuration",
    );
    throw error;
  }
}

export async function updateProjectConfiguration(
  data: ProjectConfigurationData,
): Promise<ProjectConfiguration> {
  try {
    const workspacePath = `workspace/${data.name}`;

    const result = await db
      .insert(projectConfiguration)
      .values({
        id: 1,
        name: data.name,
        targetProjectPath: data.targetProjectPath,
        workspacePath,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: projectConfiguration.id,
        set: {
          name: data.name,
          targetProjectPath: data.targetProjectPath,
          workspacePath,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (result.length === 0 || !result[0]) {
      throw new Error("Failed to insert or update project configuration");
    }

    logger.info(
      {
        projectName: data.name,
        workspacePath,
      },
      "Project configuration updated",
    );

    return result[0];
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to update project configuration",
    );
    throw error;
  }
}

export function startDiscovery(): Promise<void> {
  logger.info("Discovery start requested (stub implementation)");
  return Promise.resolve();
}

export function getDiscoveryStatus(): Promise<{
  isDiscovering: boolean;
  phase:
    | "idle"
    | "scanning"
    | "analyzing"
    | "generating"
    | "complete"
    | "error";
  progress?: {
    filesScanned: number;
    filesAnalyzed: number;
    toolsFound: number;
    filesGenerated: number;
  };
  logs: Array<{
    timestamp: string;
    level: "info" | "warning" | "error";
    phase: "scanning" | "analyzing" | "generating" | "complete";
    message: string;
    context?: {
      filePath?: string;
      toolName?: string;
      reason?: string;
      linesExtracted?: number;
      detectedParams?: string[];
    };
  }>;
  result?: {
    discoveredToolsCount: number;
    summary: {
      filesScanned: number;
      filesWithToolImports: number;
      toolsDiscovered: number;
      filesGenerated: number;
      skippedFiles: Array<{
        path: string;
        reason: string;
      }>;
    };
    error?: string | null;
  };
}> {
  return Promise.resolve(discoveryStatusService.getCurrentStatus());
}

export async function cancelDiscovery(
  workspacePath: string,
): Promise<discoveryCancelService.CancellationResult> {
  return await discoveryCancelService.cancelDiscovery(workspacePath);
}
