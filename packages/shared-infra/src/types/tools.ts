export interface ProjectConfiguration {
  id: number;
  name: string;
  targetProjectPath: string;
  workspacePath: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  sourceDescription: string | null;
  parametersSchema: unknown;
  sourceFilePath: string;
  workspaceDir: string;
  enabled: boolean;
  detectedHookParams: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DebugMessage {
  timestamp: Date;
  message: string;
  variables?: Record<string, unknown>;
}

export interface ToolInvocationResult {
  toolId: string;
  toolName: string;
  timestamp: Date;
  inputParams: unknown;
  output: unknown;
  executionDurationMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  success: boolean;
  errorType: string | null;
  errorMessage: string | null;
  errorStack: string | null;
  llmReasoning: string | null;
  debugOutput: DebugMessage[];
}

export interface HookDefinition {
  hookType: "beforeAll" | "beforeEach" | "afterEach" | "afterAll";
  toolId: string;
  filePath: string;
  detectedParams: string[];
  stubGenerated: boolean;
}

export interface WorkspaceStructure {
  rootPath: string;
  projectWorkspacePath: string;
  tsConfigPath: string;
  toolDirectories: Map<string, string>;
}

export interface DiscoveryLogEntry {
  timestamp: Date;
  level: "info" | "warning" | "error";
  phase:
    | "scanning"
    | "analyzing"
    | "generating"
    | "complete"
    | "error"
    | "idle";
  message: string;
  context?: {
    filePath?: string;
    toolName?: string;
    reason?: string;
    linesExtracted?: number;
    detectedParams?: string[];
  };
}

export interface DiscoverySummary {
  filesScanned: number;
  filesWithToolImports: number;
  toolsDiscovered: number;
  filesGenerated: number;
  skippedFiles: Array<{
    path: string;
    reason: string;
  }>;
}
