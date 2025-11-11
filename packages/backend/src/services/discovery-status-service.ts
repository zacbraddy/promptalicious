type DiscoveryPhase =
  | "idle"
  | "scanning"
  | "analyzing"
  | "generating"
  | "complete"
  | "error";

type LogLevel = "info" | "warning" | "error";

interface LogContext {
  filePath?: string;
  toolName?: string;
  reason?: string;
  linesExtracted?: number;
  detectedParams?: string[];
}

interface DiscoveryLogEntry {
  timestamp: string;
  level: LogLevel;
  phase: "scanning" | "analyzing" | "generating" | "complete";
  message: string;
  context?: LogContext;
}

interface ProgressCounters {
  filesScanned: number;
  filesAnalyzed: number;
  toolsFound: number;
  filesGenerated: number;
}

interface DiscoverySummary {
  filesScanned: number;
  filesWithToolImports: number;
  toolsDiscovered: number;
  filesGenerated: number;
  skippedFiles: Array<{
    path: string;
    reason: string;
  }>;
}

interface DiscoveryResult {
  discoveredToolsCount: number;
  summary: DiscoverySummary;
  error?: string;
}

interface DiscoveryStatus {
  isDiscovering: boolean;
  phase: DiscoveryPhase;
  progress: ProgressCounters;
  logs: DiscoveryLogEntry[];
  result?: DiscoveryResult;
}

class DiscoveryStatusService {
  private static instance: DiscoveryStatusService;

  private isDiscovering: boolean = false;
  private phase: DiscoveryPhase = "idle";
  private progress: ProgressCounters = {
    filesScanned: 0,
    filesAnalyzed: 0,
    toolsFound: 0,
    filesGenerated: 0,
  };
  private logs: DiscoveryLogEntry[] = [];
  private result?: DiscoveryResult;
  private cancellationRequested: boolean = false;

  private constructor() {}

  public static getInstance(): DiscoveryStatusService {
    if (!DiscoveryStatusService.instance) {
      DiscoveryStatusService.instance = new DiscoveryStatusService();
    }
    return DiscoveryStatusService.instance;
  }

  public startDiscovery(): void {
    this.isDiscovering = true;
    this.phase = "scanning";
    this.progress = {
      filesScanned: 0,
      filesAnalyzed: 0,
      toolsFound: 0,
      filesGenerated: 0,
    };
    this.logs = [];
    this.result = undefined;
  }

  public updatePhase(phase: DiscoveryPhase): void {
    this.phase = phase;
  }

  public incrementCounters(counters: Partial<ProgressCounters>): void {
    if (counters.filesScanned !== undefined) {
      this.progress.filesScanned += counters.filesScanned;
    }
    if (counters.filesAnalyzed !== undefined) {
      this.progress.filesAnalyzed += counters.filesAnalyzed;
    }
    if (counters.toolsFound !== undefined) {
      this.progress.toolsFound += counters.toolsFound;
    }
    if (counters.filesGenerated !== undefined) {
      this.progress.filesGenerated += counters.filesGenerated;
    }
  }

  public appendLog(entry: Omit<DiscoveryLogEntry, "timestamp">): void {
    this.logs.push({
      ...entry,
      timestamp: new Date().toISOString(),
    });
  }

  public getCurrentStatus(): DiscoveryStatus {
    return {
      isDiscovering: this.isDiscovering,
      phase: this.phase,
      progress: { ...this.progress },
      logs: [...this.logs],
      result: this.result,
    };
  }

  public getIncrementalLogs(offset: number): DiscoveryLogEntry[] {
    return this.logs.slice(offset);
  }

  public markComplete(summary: DiscoverySummary): void {
    this.phase = "complete";
    this.isDiscovering = false;
    this.result = {
      discoveredToolsCount: summary.toolsDiscovered,
      summary,
    };
  }

  public markError(error: string): void {
    this.phase = "error";
    this.isDiscovering = false;
    this.result = {
      discoveredToolsCount: 0,
      summary: {
        filesScanned: this.progress.filesScanned,
        filesWithToolImports: 0,
        toolsDiscovered: 0,
        filesGenerated: this.progress.filesGenerated,
        skippedFiles: [],
      },
      error,
    };
  }

  public resetState(): void {
    this.isDiscovering = false;
    this.phase = "idle";
    this.progress = {
      filesScanned: 0,
      filesAnalyzed: 0,
      toolsFound: 0,
      filesGenerated: 0,
    };
    this.logs = [];
    this.result = undefined;
  }

  public requestCancellation(): void {
    this.cancellationRequested = true;
  }

  public isCancellationRequested(): boolean {
    return this.cancellationRequested;
  }

  public acknowledgeCancellation(): void {
    this.cancellationRequested = false;
    this.resetState();
  }
}

const service = DiscoveryStatusService.getInstance();

export function startDiscovery(): void {
  return service.startDiscovery();
}

export function updatePhase(phase: DiscoveryPhase): void {
  return service.updatePhase(phase);
}

export function incrementCounters(counters: Partial<ProgressCounters>): void {
  return service.incrementCounters(counters);
}

export function appendLog(entry: Omit<DiscoveryLogEntry, "timestamp">): void {
  return service.appendLog(entry);
}

export function getCurrentStatus(): DiscoveryStatus {
  return service.getCurrentStatus();
}

export function getIncrementalLogs(offset: number): DiscoveryLogEntry[] {
  return service.getIncrementalLogs(offset);
}

export function markComplete(summary: DiscoverySummary): void {
  return service.markComplete(summary);
}

export function markError(error: string): void {
  return service.markError(error);
}

export function resetState(): void {
  return service.resetState();
}

export function requestCancellation(): void {
  return service.requestCancellation();
}

export function isCancellationRequested(): boolean {
  return service.isCancellationRequested();
}

export function acknowledgeCancellation(): void {
  return service.acknowledgeCancellation();
}
