import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ExecuteControls } from "../../src/components/ExecuteControls";

describe("ExecuteControls", () => {
  const mockExecute = vi.fn();
  const mockCancel = vi.fn();

  it("renders both Execute and Cancel buttons", () => {
    render(
      <ExecuteControls
        onExecute={mockExecute}
        onCancel={mockCancel}
        isExecuting={false}
        isPromptEmpty={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: /execute/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("disables Execute button when prompt is empty", () => {
    render(
      <ExecuteControls
        onExecute={mockExecute}
        onCancel={mockCancel}
        isExecuting={false}
        isPromptEmpty={true}
      />,
    );

    const executeButton = screen.getByRole("button", { name: /execute/i });
    expect(executeButton).toBeDisabled();
  });

  it("disables Execute button when execution is in progress", () => {
    render(
      <ExecuteControls
        onExecute={mockExecute}
        onCancel={mockCancel}
        isExecuting={true}
        isPromptEmpty={false}
      />,
    );

    const executeButton = screen.getByRole("button", { name: /execute/i });
    expect(executeButton).toBeDisabled();
  });

  it("enables Execute button when prompt is not empty and not executing", () => {
    render(
      <ExecuteControls
        onExecute={mockExecute}
        onCancel={mockCancel}
        isExecuting={false}
        isPromptEmpty={false}
      />,
    );

    const executeButton = screen.getByRole("button", { name: /execute/i });
    expect(executeButton).not.toBeDisabled();
  });

  it("disables Cancel button when not executing", () => {
    render(
      <ExecuteControls
        onExecute={mockExecute}
        onCancel={mockCancel}
        isExecuting={false}
        isPromptEmpty={false}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    expect(cancelButton).toBeDisabled();
  });

  it("enables Cancel button only during execution", () => {
    render(
      <ExecuteControls
        onExecute={mockExecute}
        onCancel={mockCancel}
        isExecuting={true}
        isPromptEmpty={false}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    expect(cancelButton).not.toBeDisabled();
  });

  it("shows loading indicator during execution", () => {
    const { container } = render(
      <ExecuteControls
        onExecute={mockExecute}
        onCancel={mockCancel}
        isExecuting={true}
        isPromptEmpty={false}
      />,
    );

    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("does not show loading indicator when not executing", () => {
    const { container } = render(
      <ExecuteControls
        onExecute={mockExecute}
        onCancel={mockCancel}
        isExecuting={false}
        isPromptEmpty={false}
      />,
    );

    expect(container.querySelector(".animate-spin")).not.toBeInTheDocument();
  });

  it("calls onExecute when Execute button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ExecuteControls
        onExecute={mockExecute}
        onCancel={mockCancel}
        isExecuting={false}
        isPromptEmpty={false}
      />,
    );

    const executeButton = screen.getByRole("button", { name: /execute/i });
    await user.click(executeButton);

    expect(mockExecute).toHaveBeenCalledOnce();
  });

  it("calls onCancel when Cancel button is clicked during execution", async () => {
    const user = userEvent.setup();

    render(
      <ExecuteControls
        onExecute={mockExecute}
        onCancel={mockCancel}
        isExecuting={true}
        isPromptEmpty={false}
      />,
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockCancel).toHaveBeenCalledOnce();
  });
});
