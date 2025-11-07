import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ExecutionResult } from "@promptalicious/shared-infra";

import { DiagnosticsDisplay } from "@/components/DiagnosticsDisplay";

describe("DiagnosticsDisplay", () => {
  const mockResult: ExecutionResult = {
    id: "test-result-id",
    promptExecutionId: "test-execution-id",
    responseText: "Test response",
    inputTokenCount: 150,
    outputTokenCount: 250,
    totalTokenCount: 400,
    executionDurationMs: 1523,
    estimatedCostGBP: 0.0012,
  };

  it("renders diagnostic information card", () => {
    render(<DiagnosticsDisplay result={mockResult} />);

    // Card is rendered (checking for diagnostic metrics)
    expect(screen.getByText("Input Tokens")).toBeInTheDocument();
    expect(screen.getByText("Output Tokens")).toBeInTheDocument();
  });

  it("displays input token count", () => {
    render(<DiagnosticsDisplay result={mockResult} />);

    expect(screen.getByText("Input Tokens")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
  });

  it("displays output token count", () => {
    render(<DiagnosticsDisplay result={mockResult} />);

    expect(screen.getByText("Output Tokens")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
  });

  it("displays total token count", () => {
    render(<DiagnosticsDisplay result={mockResult} />);

    expect(screen.getByText("Total Tokens")).toBeInTheDocument();
    expect(screen.getByText("400")).toBeInTheDocument();
  });

  it("displays execution duration with ms unit", () => {
    render(<DiagnosticsDisplay result={mockResult} />);

    expect(screen.getByText("Execution Duration")).toBeInTheDocument();
    expect(screen.getByText("1,523 ms")).toBeInTheDocument();
  });

  it("displays estimated cost in GBP with 6 decimal places", () => {
    render(<DiagnosticsDisplay result={mockResult} />);

    expect(screen.getByText("Estimated Cost")).toBeInTheDocument();
    expect(screen.getByText("£0.001200")).toBeInTheDocument();
  });

  it("formats large token counts with thousand separators", () => {
    const largeResult: ExecutionResult = {
      ...mockResult,
      inputTokenCount: 12500,
      outputTokenCount: 45600,
      totalTokenCount: 58100,
    };

    render(<DiagnosticsDisplay result={largeResult} />);

    expect(screen.getByText("12,500")).toBeInTheDocument();
    expect(screen.getByText("45,600")).toBeInTheDocument();
    expect(screen.getByText("58,100")).toBeInTheDocument();
  });

  it("renders table with correct structure", () => {
    render(<DiagnosticsDisplay result={mockResult} />);

    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    expect(
      screen.getByRole("columnheader", { name: "Metric" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Value" }),
    ).toBeInTheDocument();

    const rows = screen.getAllByRole("row");
    expect(rows.length).toBe(6);
  });

  it("displays all metrics in correct order", () => {
    render(<DiagnosticsDisplay result={mockResult} />);

    const metricCells = screen.getAllByRole("cell");

    const metricNames = [
      "Input Tokens",
      "Output Tokens",
      "Total Tokens",
      "Execution Duration",
      "Estimated Cost",
    ];

    metricNames.forEach((name, index) => {
      expect(metricCells[index * 2]).toHaveTextContent(name);
    });
  });
});
