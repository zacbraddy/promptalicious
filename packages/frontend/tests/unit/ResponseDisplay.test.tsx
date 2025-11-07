import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ExecutionResult } from "@promptalicious/shared-infra";

import { ResponseDisplay } from "@/components/ResponseDisplay";

describe("ResponseDisplay", () => {
  afterEach(() => {
    cleanup();
  });

  const createMockResult = (
    overrides?: Partial<ExecutionResult>,
  ): ExecutionResult => ({
    id: "test-result-id",
    promptExecutionId: "test-execution-id",
    responseText: "This is a test response from the LLM.",
    inputTokenCount: 10,
    outputTokenCount: 8,
    totalTokenCount: 18,
    executionDurationMs: 1500,
    estimatedCostGBP: 0.0005,
    ...overrides,
  });

  it("renders response display card", () => {
    const mockResult = createMockResult();
    render(<ResponseDisplay result={mockResult} />);

    // Card is rendered (checking for the response text content)
    expect(screen.getByText(mockResult.responseText)).toBeInTheDocument();
  });

  it("displays the full response text", () => {
    const responseText = "This is a complete test response from the LLM.";
    const mockResult = createMockResult({ responseText });

    render(<ResponseDisplay result={mockResult} />);

    expect(screen.getByText(responseText)).toBeInTheDocument();
  });

  it("renders response in a pre element for formatting", () => {
    const mockResult = createMockResult();
    render(<ResponseDisplay result={mockResult} />);

    const preElement = screen.getByText(mockResult.responseText);
    expect(preElement.tagName).toBe("PRE");
  });

  it("preserves line breaks in multi-line responses", () => {
    const multiLineResponse = "Line 1\nLine 2\nLine 3";
    const mockResult = createMockResult({ responseText: multiLineResponse });

    render(<ResponseDisplay result={mockResult} />);

    const preElement = screen.getByText((content, element) => {
      return (
        element?.tagName === "PRE" &&
        content.includes("Line 1") &&
        content.includes("Line 3")
      );
    });
    expect(preElement).toHaveClass("whitespace-pre-wrap");
  });

  it("handles long text with scrollable container", () => {
    const longText = "a ".repeat(1000);
    const mockResult = createMockResult({ responseText: longText });

    render(<ResponseDisplay result={mockResult} />);

    const preElement = screen.getByText((content, element) => {
      return element?.tagName === "PRE" && content.startsWith("a a a");
    });
    const container = preElement.parentElement;
    expect(container).toHaveClass("overflow-y-auto");
    expect(container).toHaveClass("max-h-[600px]");
  });

  it("displays empty response text correctly", () => {
    const mockResult = createMockResult({ responseText: "" });

    render(<ResponseDisplay result={mockResult} />);

    const preElement = screen.getByText("", { selector: "pre" });
    expect(preElement).toBeInTheDocument();
  });

  it("handles special characters in response text", () => {
    const specialCharsText = "Test <>&\"'\n\t\\";
    const mockResult = createMockResult({ responseText: specialCharsText });

    render(<ResponseDisplay result={mockResult} />);

    const preElement = screen.getByText((content, element) => {
      return element?.tagName === "PRE" && content.includes("Test");
    });
    expect(preElement).toBeInTheDocument();
    expect(preElement.textContent).toBe(specialCharsText);
  });

  it("wraps long words to prevent horizontal overflow", () => {
    const longWord = "a".repeat(100);
    const mockResult = createMockResult({ responseText: longWord });

    render(<ResponseDisplay result={mockResult} />);

    const preElement = screen.getByText(longWord);
    expect(preElement).toHaveClass("break-words");
  });

  it("applies styling for readable text display", () => {
    const mockResult = createMockResult();
    render(<ResponseDisplay result={mockResult} />);

    const preElement = screen.getByText(mockResult.responseText);
    expect(preElement).toHaveClass("font-sans");
    expect(preElement).toHaveClass("text-sm");
    expect(preElement).toHaveClass("leading-relaxed");
  });

  it("contains a border and background for visual distinction", () => {
    const mockResult = createMockResult();
    render(<ResponseDisplay result={mockResult} />);

    const container = screen.getByText(mockResult.responseText).parentElement;
    expect(container).toHaveClass("border");
    expect(container).toHaveClass("bg-muted/30");
    expect(container).toHaveClass("rounded-md");
  });
});
