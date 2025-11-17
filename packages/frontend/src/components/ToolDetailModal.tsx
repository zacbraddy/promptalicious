import { useState, useEffect } from "react";
import { Loader2, Copy, Check, ExternalLink } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useGetTool, useUpdateTool } from "@/hooks/useTools";

interface ToolDetailModalProps {
  toolId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ToolDetailModal({
  toolId,
  isOpen,
  onClose,
}: ToolDetailModalProps) {
  const { data: tool, isLoading, isError, error } = useGetTool(toolId || "");
  const updateToolMutation = useUpdateTool();
  const [description, setDescription] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDescription(tool?.description || "");
    setHasUnsavedChanges(false);
  }, [tool?.description]);

  const handleDescriptionChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const newValue = event.target.value;
    setDescription(newValue);
    setHasUnsavedChanges(newValue !== (tool?.description || ""));
  };

  const handleSave = () => {
    if (!toolId || !tool) return;

    void updateToolMutation
      .mutateAsync({
        toolId,
        data: { description },
      })
      .then(() => {
        toast.success("Tool description updated successfully");
        setHasUnsavedChanges(false);
      })
      .catch((err: unknown) => {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update tool";
        toast.error(errorMessage);
      });
  };

  const handleCopyPath = () => {
    if (!tool) return;

    void navigator.clipboard
      .writeText(tool.workspaceDir)
      .then(() => {
        setIsCopied(true);
        toast.success("Workspace path copied to clipboard");
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(() => {
        toast.error("Failed to copy path to clipboard");
      });
  };

  const handleOpenInEditor = () => {
    if (!tool) return;

    const fileUrl = `file://${tool.workspaceDir}`;
    window.open(fileUrl, "_blank");
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tool Details</DialogTitle>
          <DialogDescription>
            View and edit tool configuration
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {isError && (
          <div className="text-destructive py-4">
            <p className="font-semibold">Error loading tool details</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : "Failed to load tool"}
            </p>
          </div>
        )}

        {tool && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tool Name</label>
              <div className="px-3 py-2 rounded-md border bg-muted text-muted-foreground">
                {tool.name}
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={handleDescriptionChange}
                rows={4}
                className="font-mono text-sm"
                placeholder="Enter tool description..."
              />
              {tool.sourceDescription &&
                tool.sourceDescription !== tool.description && (
                  <p className="text-xs text-amber-500">
                    ⚠️ Description customised (source: &quot;
                    {tool.sourceDescription}&quot;)
                  </p>
                )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Parameters Schema</label>
              <div className="rounded-md border bg-muted/30">
                <pre className="p-4 text-xs overflow-x-auto">
                  <code>{JSON.stringify(tool.parametersSchema, null, 2)}</code>
                </pre>
              </div>
            </div>

            {tool.detectedHookParams && tool.detectedHookParams.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Detected Hook Parameters
                </label>
                <div className="rounded-md border bg-muted/30 p-4">
                  <ul className="space-y-1">
                    {tool.detectedHookParams.map((param) => (
                      <li key={param} className="text-sm font-mono">
                        • {param}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Workspace Directory</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-md border bg-muted/30 text-sm font-mono overflow-x-auto">
                  {tool.workspaceDir}
                </div>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={handleCopyPath}
                  title="Copy path to clipboard"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={handleOpenInEditor}
                  title="Open in file browser"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              !hasUnsavedChanges ||
              updateToolMutation.isPending ||
              isLoading ||
              !tool
            }
          >
            {updateToolMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
