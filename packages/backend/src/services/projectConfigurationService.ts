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

export function getProjectConfiguration(): Promise<ProjectConfiguration | null> {
  throw new Error("Not implemented");
}

export function updateProjectConfiguration(
  _data: ProjectConfigurationData,
): Promise<ProjectConfiguration> {
  throw new Error("Not implemented");
}

export function startDiscovery(): Promise<void> {
  throw new Error("Not implemented");
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
  throw new Error("Not implemented");
}
