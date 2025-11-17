import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table";
import type { ExecutionResult } from "@promptalicious/shared-infra";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DiagnosticsDisplayProps {
  result: ExecutionResult;
}

type DiagnosticRow = {
  metric: string;
  value: string;
  isToolMetric?: boolean;
};

const columnHelper = createColumnHelper<DiagnosticRow>();

export function DiagnosticsDisplay({ result }: DiagnosticsDisplayProps) {
  const toolMetrics = useMemo(() => {
    if (!result.toolInvocations) {
      return null;
    }

    if (result.toolInvocations.length === 0) {
      return {
        invocationCount: 0,
        totalToolTokens: 0,
        totalToolTime: 0,
        errorCount: 0,
        noToolsInvoked: true,
      };
    }

    const invocationCount = result.toolInvocations.length;
    const totalToolTokens = result.toolInvocations.reduce(
      (sum, inv) => sum + (inv.inputTokens || 0) + (inv.outputTokens || 0),
      0,
    );
    const totalToolTime = result.toolInvocations.reduce(
      (sum, inv) => sum + inv.executionDurationMs,
      0,
    );
    const errorCount = result.toolInvocations.filter(
      (inv) => !inv.success,
    ).length;

    return {
      invocationCount,
      totalToolTokens,
      totalToolTime,
      errorCount,
      noToolsInvoked: false,
    };
  }, [result.toolInvocations]);

  const data = useMemo<DiagnosticRow[]>(() => {
    const baseMetrics: DiagnosticRow[] = [
      {
        metric: "Input Tokens",
        value: result.inputTokenCount.toLocaleString(),
      },
      {
        metric: "Output Tokens",
        value: result.outputTokenCount.toLocaleString(),
      },
      {
        metric: "Total Tokens",
        value: result.totalTokenCount.toLocaleString(),
      },
      {
        metric: "Execution Duration",
        value: `${result.executionDurationMs.toLocaleString()} ms`,
      },
      {
        metric: "Estimated Cost",
        value: `£${result.estimatedCostGBP.toFixed(6)}`,
      },
    ];

    if (!toolMetrics) {
      return baseMetrics;
    }

    if (toolMetrics.noToolsInvoked) {
      const toolStatusRows: DiagnosticRow[] = [
        {
          metric: "Tool Usage",
          value: "No tools invoked",
          isToolMetric: true,
        },
      ];

      if (result.finishReason) {
        toolStatusRows.push({
          metric: "Finish Reason",
          value: String(result.finishReason),
          isToolMetric: true,
        });
      }

      if (result.reasoning) {
        toolStatusRows.push({
          metric: "Model Reasoning",
          value: String(result.reasoning),
          isToolMetric: true,
        });
      }

      return [...baseMetrics, ...toolStatusRows];
    }

    const toolMetricRows: DiagnosticRow[] = [
      {
        metric: "Tool Invocations",
        value: toolMetrics.invocationCount.toLocaleString(),
        isToolMetric: true,
      },
      {
        metric: "Tool Tokens",
        value: toolMetrics.totalToolTokens.toLocaleString(),
        isToolMetric: true,
      },
      {
        metric: "Tool Execution Time",
        value: `${toolMetrics.totalToolTime.toLocaleString()} ms`,
        isToolMetric: true,
      },
    ];

    if (toolMetrics.errorCount > 0) {
      toolMetricRows.push({
        metric: "Tool Errors",
        value: toolMetrics.errorCount.toLocaleString(),
        isToolMetric: true,
      });
    }

    return [...baseMetrics, ...toolMetricRows];
  }, [result, toolMetrics]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("metric", {
        header: "Metric",
        cell: (info) => (
          <span className="font-medium">
            {info.getValue()}
            {info.row.original.isToolMetric && (
              <Badge variant="secondary" className="ml-2">
                Tool
              </Badge>
            )}
          </span>
        ),
      }),
      columnHelper.accessor("value", {
        header: "Value",
        cell: (info) => <span className="font-mono">{info.getValue()}</span>,
      }),
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
