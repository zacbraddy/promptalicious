import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

import { SettingsForm } from "@/components/SettingsForm";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("SettingsForm", () => {
  const mockOnSubmit = vi.fn();
  const availableModels = ["gpt-4o-mini"];

  beforeEach(() => {
    mockOnSubmit.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders all form fields", () => {
    render(
      <SettingsForm
        availableModels={availableModels}
        onSubmit={mockOnSubmit}
      />,
    );

    expect(screen.getByLabelText(/model/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /save configuration/i }),
    ).toBeInTheDocument();
  });

  it("defaults model to first available model when no initial model provided", () => {
    render(
      <SettingsForm
        availableModels={availableModels}
        onSubmit={mockOnSubmit}
      />,
    );

    const modelSelect = screen.getByRole("combobox");
    expect(modelSelect).toHaveTextContent("gpt-4o-mini");
  });

  it("uses initial values when provided", () => {
    render(
      <SettingsForm
        availableModels={availableModels}
        initialModel="gpt-4o-mini"
        initialApiKey="test-key"
        onSubmit={mockOnSubmit}
      />,
    );

    const modelSelect = screen.getByRole("combobox");
    expect(modelSelect).toHaveTextContent("gpt-4o-mini");
    expect(screen.getByLabelText(/api key/i)).toHaveValue("test-key");
  });

  it("handles API key input changes", async () => {
    const user = userEvent.setup();
    render(
      <SettingsForm
        availableModels={availableModels}
        onSubmit={mockOnSubmit}
      />,
    );

    const apiKeyInput = screen.getByLabelText(/api key/i);
    await user.type(apiKeyInput, "my-secret-key");

    expect(apiKeyInput).toHaveValue("my-secret-key");
  });

  it("submits form with correct data", async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <SettingsForm
        availableModels={availableModels}
        onSubmit={mockOnSubmit}
      />,
    );

    await user.type(screen.getByLabelText(/api key/i), "test-api-key");
    await user.click(
      screen.getByRole("button", { name: /save configuration/i }),
    );

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        selectedModel: "gpt-4o-mini",
        apiKey: "test-api-key",
      });
    });
  });

  it("shows loading state during submission", async () => {
    const user = userEvent.setup();
    let resolveSubmit: () => void;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    mockOnSubmit.mockReturnValue(submitPromise);

    render(
      <SettingsForm
        availableModels={availableModels}
        initialApiKey="test-key"
        onSubmit={mockOnSubmit}
      />,
    );

    const submitButton = screen.getByRole("button", {
      name: /save configuration/i,
    });
    await user.click(submitButton);

    expect(screen.getByText(/saving\.\.\./i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    expect(screen.getByLabelText(/model/i)).toBeDisabled();
    expect(screen.getByLabelText(/api key/i)).toBeDisabled();

    resolveSubmit!();
    await waitFor(() => {
      expect(screen.getByText(/save configuration/i)).toBeInTheDocument();
    });
  });

  it("renders API key input with password type", () => {
    render(
      <SettingsForm
        availableModels={availableModels}
        onSubmit={mockOnSubmit}
      />,
    );

    const apiKeyInput = screen.getByLabelText(/api key/i);
    expect(apiKeyInput).toHaveAttribute("type", "password");
  });

  it("prevents clearing the model selection", () => {
    const TestWrapper = () => {
      const [selectedModel, setSelectedModel] = React.useState("gpt-4o-mini");

      const handleValueChange = (value: string) => {
        if (value) setSelectedModel(value);
      };

      return (
        <div>
          <select
            data-testid="model-select"
            value={selectedModel}
            onChange={(e) => handleValueChange(e.target.value)}
          >
            <option value="">Clear</option>
            <option value="gpt-4o-mini">gpt-4o-mini</option>
          </select>
          <span data-testid="selected-value">{selectedModel}</span>
        </div>
      );
    };

    render(<TestWrapper />);

    const select = screen.getByTestId("model-select");
    const selectedValue = screen.getByTestId("selected-value");

    expect(selectedValue).toHaveTextContent("gpt-4o-mini");

    fireEvent.change(select, { target: { value: "" } });

    expect(selectedValue).toHaveTextContent("gpt-4o-mini");
  });

  it("displays success toast when form submission succeeds", async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <SettingsForm
        availableModels={availableModels}
        initialApiKey="test-key"
        onSubmit={mockOnSubmit}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /save configuration/i }),
    );

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Configuration saved and validated successfully",
      );
    });
  });

  it("displays error toast when form submission fails", async () => {
    const user = userEvent.setup();
    const errorMessage = "Invalid API key";
    mockOnSubmit.mockRejectedValue(new Error(errorMessage));

    render(
      <SettingsForm
        availableModels={availableModels}
        initialApiKey="test-key"
        onSubmit={mockOnSubmit}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /save configuration/i }),
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorMessage);
    });
  });

  it("displays spinner on button during submission", async () => {
    const user = userEvent.setup();
    let resolveSubmit: () => void;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    mockOnSubmit.mockReturnValue(submitPromise);

    render(
      <SettingsForm
        availableModels={availableModels}
        initialApiKey="test-key"
        onSubmit={mockOnSubmit}
      />,
    );

    const submitButton = screen.getByRole("button", {
      name: /save configuration/i,
    });
    await user.click(submitButton);

    const spinner = submitButton.querySelector("svg");
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass("animate-spin");

    resolveSubmit!();
    await waitFor(() => {
      expect(screen.getByText(/save configuration/i)).toBeInTheDocument();
    });
  });

  it("calls onSubmittingChange during submission", async () => {
    const user = userEvent.setup();
    const onSubmittingChange = vi.fn();
    let resolveSubmit: () => void;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    mockOnSubmit.mockReturnValue(submitPromise);

    render(
      <SettingsForm
        availableModels={availableModels}
        initialApiKey="test-key"
        onSubmit={mockOnSubmit}
        onSubmittingChange={onSubmittingChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /save configuration/i }),
    );

    expect(onSubmittingChange).toHaveBeenCalledWith(true);

    resolveSubmit!();
    await waitFor(() => {
      expect(onSubmittingChange).toHaveBeenCalledWith(false);
    });
  });
});
