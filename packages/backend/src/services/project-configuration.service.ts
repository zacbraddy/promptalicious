import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { eq } from "drizzle-orm";

import { db } from "@/db/connection";
import { projectConfiguration } from "@/db/schema";
import { logger } from "@/lib/logger";
import * as discoveryCancelService from "@/services/discovery-cancel.service";
import * as discoveryStatusService from "@/services/discovery-status.service";
import { discoverTools } from "@/services/tool-discovery.service";
import { WorkspaceGeneratorService } from "@/services/workspace-generator.service";

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

export async function startDiscovery(): Promise<void> {
  const config = await getProjectConfiguration();

  if (!config) {
    logger.error("Cannot start discovery: No project configuration found");
    return;
  }

  logger.info(
    {
      projectName: config.name,
      targetProjectPath: config.targetProjectPath,
    },
    "Starting async tool discovery",
  );

  void runDiscoveryAsync(config);
}

async function runDiscoveryAsync(config: ProjectConfiguration): Promise<void> {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const repoRoot = path.resolve(__dirname, "../../../..");
    const absoluteProjectPath = path.resolve(
      repoRoot,
      config.targetProjectPath,
    );

    try {
      const stats = await fs.stat(absoluteProjectPath);
      if (!stats.isDirectory()) {
        throw new Error(
          `Target project path is not a directory: ${config.targetProjectPath}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Target project path does not exist: ${config.targetProjectPath}`;
      discoveryStatusService.markError(errorMessage);
      logger.error(
        { targetProjectPath: config.targetProjectPath, error: errorMessage },
        "Discovery failed: Invalid target project path",
      );
      return;
    }

    discoveryStatusService.startDiscovery();
    discoveryStatusService.updatePhase("scanning");

    const discoveryResult = await discoverTools(absoluteProjectPath);

    if (discoveryStatusService.isCancellationRequested()) {
      logger.info("Discovery cancelled during tool discovery phase");
      return;
    }

    discoveryStatusService.updatePhase("generating");

    const workspaceGenerator = new WorkspaceGeneratorService();
    await workspaceGenerator.generateWorkspace(
      config.name,
      absoluteProjectPath,
      discoveryResult.tools,
    );

    if (discoveryStatusService.isCancellationRequested()) {
      logger.info("Discovery cancelled during workspace generation phase");
      return;
    }

    discoveryStatusService.updatePhase("complete");
    discoveryStatusService.markComplete(discoveryResult.summary);

    logger.info(
      {
        toolsDiscovered: discoveryResult.summary.toolsDiscovered,
        filesScanned: discoveryResult.summary.filesScanned,
        filesGenerated: discoveryResult.summary.filesGenerated,
      },
      "Tool discovery completed successfully",
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown discovery error";

    discoveryStatusService.markError(errorMessage);

    logger.error(
      {
        error: errorMessage,
        projectName: config.name,
        targetProjectPath: config.targetProjectPath,
      },
      "Tool discovery failed",
    );
  }
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
