import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PromptInput } from "@/components/PromptInput";

describe("PromptInput", () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders textarea with placeholder", () => {
    render(<PromptInput value="" onChange={mockOnChange} />);

    const textarea = screen.getByRole("textbox", {
      name: /system prompt input/i,
    });
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute(
      "placeholder",
      "Enter your system prompt here...",
    );
  });

  it("displays initial value", () => {
    const initialValue = "Test prompt text";
    render(<PromptInput value={initialValue} onChange={mockOnChange} />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue(initialValue);
  });

  it("displays character count with correct format", () => {
    render(<PromptInput value="" onChange={mockOnChange} />);

    const characterCount = screen.getByText(/0 \/ 50,000 characters/i);
    expect(characterCount).toBeInTheDocument();
  });

  it("updates character count when value changes", () => {
    const { rerender } = render(
      <PromptInput value="" onChange={mockOnChange} />,
    );

    expect(screen.getByText(/0 \/ 50,000 characters/i)).toBeInTheDocument();

    rerender(<PromptInput value="Hello World" onChange={mockOnChange} />);

    expect(screen.getByText(/11 \/ 50,000 characters/i)).toBeInTheDocument();
  });

  it("calls onChange when user types", async () => {
    const user = userEvent.setup();
    render(<PromptInput value="" onChange={mockOnChange} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Test");

    expect(mockOnChange).toHaveBeenCalled();
  });

  it("accepts custom placeholder", () => {
    const customPlaceholder = "Custom placeholder text";
    render(
      <PromptInput
        value=""
        onChange={mockOnChange}
        placeholder={customPlaceholder}
      />,
    );

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("placeholder", customPlaceholder);
  });

  it("can be disabled", () => {
    render(<PromptInput value="" onChange={mockOnChange} disabled={true} />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeDisabled();
  });

  it("prevents input when max length is reached", async () => {
    const user = userEvent.setup();
    const maxLengthText = "a".repeat(50000);

    render(<PromptInput value={maxLengthText} onChange={mockOnChange} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "x");

    // onChange should not be called because we're at max length
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("shows correct character count format with thousands separator", () => {
    const longText = "a".repeat(1234);
    render(<PromptInput value={longText} onChange={mockOnChange} />);

    const characterCount = screen.getByText(/1,234 \/ 50,000 characters/i);
    expect(characterCount).toBeInTheDocument();
  });

  it("allows input when under max length", async () => {
    const user = userEvent.setup();
    render(<PromptInput value="" onChange={mockOnChange} />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Test input");

    expect(mockOnChange).toHaveBeenCalled();
  });

  it("updates character count dynamically as user types", () => {
    const { rerender } = render(
      <PromptInput value="" onChange={mockOnChange} />,
    );

    expect(screen.getByText(/0 \/ 50,000 characters/i)).toBeInTheDocument();

    // Simulate typing by updating the value prop
    const newValue = "Test";
    rerender(<PromptInput value={newValue} onChange={mockOnChange} />);

    expect(screen.getByText(/4 \/ 50,000 characters/i)).toBeInTheDocument();
  });

  it("has appropriate aria attributes for accessibility", () => {
    render(<PromptInput value="" onChange={mockOnChange} />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("aria-label", "System prompt input");
    expect(textarea).toHaveAttribute("aria-describedby", "character-count");

    const characterCount = screen.getByText(/0 \/ 50,000 characters/i);
    expect(characterCount).toHaveAttribute("id", "character-count");
    expect(characterCount).toHaveAttribute("aria-live", "polite");
  });
});
