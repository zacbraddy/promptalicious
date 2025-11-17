import { useState, useEffect } from "react";
import { Loader2, Copy, Check, Download } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGenerateExport } from "@/hooks/useExport";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  includeDisabledTools?: boolean;
}

export function ExportModal({
  isOpen,
  onClose,
  includeDisabledTools = false,
}: ExportModalProps) {
  const generateExportMutation = useGenerateExport();
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (
      isOpen &&
      !generateExportMutation.data &&
      !generateExportMutation.isPending
    ) {
      void generateExportMutation.mutateAsync({ includeDisabledTools });
    }
  }, [isOpen, includeDisabledTools, generateExportMutation]);

  const handleCopyToClipboard = () => {
    if (!generateExportMutation.data) return;

    void navigator.clipboard
      .writeText(generateExportMutation.data.markdown)
      .then(() => {
        setIsCopied(true);
        toast.success("Export instructions copied to clipboard");
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(() => {
        toast.error("Failed to copy to clipboard");
      });
  };

  const handleDownload = () => {
    if (!generateExportMutation.data) return;

    const blob = new Blob([generateExportMutation.data.markdown], {
      type: "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `promptalicious-export-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Export instructions downloaded");
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Instructions</DialogTitle>
          <DialogDescription>
            Code-generated instructions for applying your tool configurations
            back to your codebase
          </DialogDescription>
        </DialogHeader>

        {generateExportMutation.isPending && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">
              Generating export instructions...
            </span>
          </div>
        )}

        {generateExportMutation.isError && (
          <div className="text-destructive py-4">
            <p className="font-semibold">
              Error generating export instructions
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {generateExportMutation.error instanceof Error
                ? generateExportMutation.error.message
                : "Failed to generate export instructions"}
            </p>
          </div>
        )}

        {generateExportMutation.data && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Tools included:</span>{" "}
                {generateExportMutation.data.toolsIncluded}
              </div>
              <div>
                <span className="font-medium">Generated:</span>{" "}
                {new Date(
                  generateExportMutation.data.generatedAt,
                ).toLocaleString()}
              </div>
            </div>

            <div className="rounded-md border bg-muted/30">
              <pre className="p-4 text-xs overflow-x-auto max-h-[50vh] overflow-y-auto">
                <code>{generateExportMutation.data.markdown}</code>
              </pre>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleCopyToClipboard}
                disabled={!generateExportMutation.data}
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="ml-2">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span className="ml-2">Copy to Clipboard</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={!generateExportMutation.data}
              >
                <Download className="h-4 w-4" />
                <span className="ml-2">Download as .md</span>
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
