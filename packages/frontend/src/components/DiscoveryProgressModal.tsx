import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  FileSearch,
  Hammer,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGetDiscoveryStatus } from "@/hooks/useProjectConfiguration";

interface DiscoveryProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTimestamp(timestamp: Date | string): string {
  return new Date(timestamp).toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    fractionalSecondDigits: 3,
  });
}

function getPhaseIcon(phase: string) {
  switch (phase) {
    case "scanning":
      return <FileSearch className="h-4 w-4" />;
    case "analyzing":
      return <Loader2 className="h-4 w-4 animate-spin" />;
    case "generating":
      return <Hammer className="h-4 w-4" />;
    case "complete":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "error":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Loader2 className="h-4 w-4 animate-spin" />;
  }
}

function getPhaseLabel(phase: string): string {
  switch (phase) {
    case "scanning":
      return "Scanning project files...";
    case "analyzing":
      return "Analyzing tool definitions...";
    case "generating":
      return "Generating workspace files...";
    case "complete":
      return "Discovery complete!";
    case "error":
      return "Discovery failed";
    case "idle":
      return "Idle";
    default:
      return "Processing...";
  }
}

function getLevelBadgeVariant(
  level: string,
): "default" | "secondary" | "destructive" {
  switch (level) {
    case "error":
      return "destructive";
    case "warning":
      return "secondary";
    default:
      return "default";
  }
}

export function DiscoveryProgressModal({
  open,
  onOpenChange,
}: DiscoveryProgressModalProps) {
  const queryClient = useQueryClient();
  const { status, isLoading } = useGetDiscoveryStatus();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const prevLogCountRef = useRef(0);
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (open && !hasOpenedRef.current) {
      hasOpenedRef.current = true;
      queryClient.setQueryData(["project", "discovery", "status"], null);
      void queryClient.invalidateQueries({
        queryKey: ["project", "discovery", "status"],
      });
    } else if (!open) {
      hasOpenedRef.current = false;
    }
  }, [open, queryClient]);

  useEffect(() => {
    if (
      status?.logs &&
      status.logs.length > prevLogCountRef.current &&
      scrollAreaRef.current
    ) {
      prevLogCountRef.current = status.logs.length;
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [status?.logs]);

  if (isLoading || !status) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Tool Discovery</DialogTitle>
            <DialogDescription>
              Starting tool discovery process...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <span className="text-lg text-muted-foreground">Loading...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const isError = status.phase === "error";
  const isInProgress = status.isDiscovering;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getPhaseIcon(status.phase)}
            Tool Discovery
          </DialogTitle>
          <DialogDescription>{getPhaseLabel(status.phase)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {status.progress && (
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Files Scanned</p>
                <p className="text-2xl font-bold text-foreground">
                  {status.progress.filesScanned}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Files Analyzed</p>
                <p className="text-2xl font-bold text-foreground">
                  {status.progress.filesAnalyzed}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Tools Found</p>
                <p className="text-2xl font-bold text-accent">
                  {status.progress.toolsFound}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Files Generated</p>
                <p className="text-2xl font-bold text-accent">
                  {status.progress.filesGenerated}
                </p>
              </div>
            </div>
          )}

          {status.logs && status.logs.length > 0 && (
            <>
              <hr />
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  You can expand the advanced output below to see a detailed log
                  output showing discovery process internals
                </p>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="logs" className="border-none">
                    <AccordionTrigger className="text-sm hover:no-underline py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          Advanced Output
                        </span>
                        <Badge variant="secondary" className="ml-2">
                          {status.logs.length} entries
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea
                        ref={scrollAreaRef}
                        className="h-[200px] border rounded-lg bg-black/40"
                      >
                        <div className="p-4 space-y-2 font-mono text-xs">
                          {status.logs.map((log, index) => (
                            <div key={index} className="flex gap-2">
                              <span className="text-muted-foreground shrink-0">
                                {formatTimestamp(log.timestamp)}
                              </span>
                              <Badge
                                variant={getLevelBadgeVariant(log.level)}
                                className="shrink-0 h-5"
                              >
                                {log.level}
                              </Badge>
                              <span className="text-foreground">
                                {log.message}
                              </span>
                              {log.context && (
                                <span className="text-muted-foreground">
                                  {JSON.stringify(log.context)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </>
          )}

          {isError && status.result?.error && (
            <div className="border rounded-lg p-4 bg-destructive/10 border-destructive/20">
              <div className="text-sm text-destructive flex items-start gap-2">
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium mb-1">Discovery Failed</p>
                  <p>{status.result.error}</p>
                </div>
              </div>
            </div>
          )}

          {isInProgress && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Discovery in progress...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
