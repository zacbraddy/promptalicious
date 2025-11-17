import { useState } from "react";
import { Loader2, Wrench, Eye } from "lucide-react";
import { toast } from "sonner";
import type { ToolDefinition } from "@promptalicious/shared-infra";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useGetTools, useUpdateTool } from "@/hooks/useTools";
import { ToolDetailModal } from "@/components/ToolDetailModal";

export function ToolsPage() {
  const { data: tools, isLoading, isError, error } = useGetTools();
  const updateToolMutation = useUpdateTool();
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isNoProjectConfigured =
    isError &&
    error instanceof Error &&
    error.message.includes("No project configured");

  const handleToggleEnabled = async (tool: ToolDefinition) => {
    try {
      await updateToolMutation.mutateAsync({
        toolId: tool.id,
        data: { enabled: !tool.enabled },
      });
      toast.success(
        `Tool "${tool.name}" ${!tool.enabled ? "enabled" : "disabled"}`,
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update tool";
      toast.error(errorMessage);
    }
  };

  const handleViewDetails = (toolId: string) => {
    setSelectedToolId(toolId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedToolId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError && !isNoProjectConfigured) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">
            Error Loading Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "Failed to load tools"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isNoProjectConfigured || !tools || tools.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-6 w-6" />
            Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tools Discovered</h3>
            <p className="text-muted-foreground max-w-md">
              Configure your project in Settings to discover tools from your
              codebase.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sortedTools = [...tools].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-6 w-6" />
              Discovered Tools
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({tools.length} {tools.length === 1 ? "tool" : "tools"})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedTools.map((tool) => (
                <Card key={tool.id} className="border-muted">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <h3 className="text-lg font-semibold">{tool.name}</h3>
                        <p className="text-muted-foreground">
                          {tool.description}
                        </p>
                        {tool.sourceDescription &&
                          tool.sourceDescription !== tool.description && (
                            <p className="text-xs text-amber-500">
                              ⚠️ Description customised (source:{" "}
                              {tool.sourceDescription})
                            </p>
                          )}
                      </div>
                      <div className="flex flex-col items-end gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 w-full"
                          onClick={() => handleViewDetails(tool.id)}
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Button>
                        <div className="flex items-center gap-2 justify-between w-full pe-4 ps-2">
                          <Switch
                            checked={tool.enabled}
                            onCheckedChange={() => {
                              void handleToggleEnabled(tool);
                            }}
                            disabled={updateToolMutation.isPending}
                            aria-label={`Toggle ${tool.name}`}
                          />
                          <span className="text-sm text-muted-foreground min-w-[4rem]">
                            {tool.enabled ? "Enabled" : "Disabled"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <ToolDetailModal
        key={selectedToolId}
        toolId={selectedToolId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </>
  );
}
