import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table";
import type { ExecutionResult } from "@promptalicious/shared-infra";

import { Card, CardContent } from "@/components/ui/card";
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
};

const columnHelper = createColumnHelper<DiagnosticRow>();

export function DiagnosticsDisplay({ result }: DiagnosticsDisplayProps) {
  const data = useMemo<DiagnosticRow[]>(
    () => [
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
    ],
    [result],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("metric", {
        header: "Metric",
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
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
