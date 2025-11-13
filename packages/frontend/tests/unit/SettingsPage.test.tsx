import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";

import { SettingsPage } from "@/pages/SettingsPage";
import * as apiClient from "@/services/apiClient";

vi.mock("@/services/apiClient", () => ({
  getConfig: vi.fn(),
  updateConfig: vi.fn(),
  testConnection: vi.fn(),
  getProjectConfiguration: vi.fn(),
  updateProjectConfiguration: vi.fn(),
  getDiscoveryStatus: vi.fn(),
  cancelDiscovery: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.getProjectConfiguration).mockRejectedValue({
      status: 404,
      message: "No project configured",
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("displays loading state while fetching configuration", () => {
    vi.mocked(apiClient.getConfig).mockImplementation(
      () => new Promise(() => {}),
    );

    renderWithQueryClient(<SettingsPage />);

    expect(screen.getByText(/loading configuration/i)).toBeInTheDocument();
  });

  it("loads and displays existing configuration", async () => {
    vi.mocked(apiClient.getConfig).mockResolvedValue({
      config: {
        id: 1,
        selectedModel: "gpt-4o-mini",
        providerEndpoint: "https://api.openai.com/v1",
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      },
      availableModels: ["gpt-4o-mini"],
    });

    renderWithQueryClient(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("gpt-4o-mini")).toBeInTheDocument();
    });

    const apiKeyInput = screen.getByLabelText(/api key/i);
    expect(apiKeyInput).toHaveValue("    ");
  });

  it("handles configuration load failure gracefully", async () => {
    vi.mocked(apiClient.getConfig).mockRejectedValue(
      new Error("Network error"),
    );

    renderWithQueryClient(<SettingsPage />);

    await waitFor(() => {
      const apiKeyInput = screen.getByLabelText(/api key/i);
      expect(apiKeyInput).toBeInTheDocument();
    });

    const apiKeyInput = screen.getByLabelText(/api key/i);
    expect(apiKeyInput).toHaveValue("");
  });

  it("masks API key with placeholder", async () => {
    vi.mocked(apiClient.getConfig).mockResolvedValue({
      config: {
        id: 1,
        selectedModel: "gpt-4o-mini",
        providerEndpoint: undefined,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      },
      availableModels: ["gpt-4o-mini"],
    });

    renderWithQueryClient(<SettingsPage />);

    await waitFor(() => {
      const apiKeyInput = screen.getByLabelText(/api key/i);
      expect(apiKeyInput).toHaveValue("    ");
    });
  });

  it("renders settings form after loading", async () => {
    vi.mocked(apiClient.getConfig).mockResolvedValue({
      config: {
        id: 1,
        selectedModel: "gpt-4o-mini",
        providerEndpoint: undefined,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      },
      availableModels: ["gpt-4o-mini"],
    });

    renderWithQueryClient(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/model/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /save configuration/i }),
      ).toBeInTheDocument();
    });
  });

  it("uses availableModels from API response", async () => {
    vi.mocked(apiClient.getConfig).mockResolvedValue({
      config: {
        id: 1,
        selectedModel: "gpt-4o-mini",
        providerEndpoint: undefined,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      },
      availableModels: ["gpt-4o-mini", "gpt-4-turbo"],
    });

    renderWithQueryClient(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/model/i)).toBeInTheDocument();
    });

    expect(apiClient.getConfig).toHaveBeenCalledTimes(1);
  });

  it("displays overlay during form submission", async () => {
    vi.mocked(apiClient.getConfig).mockResolvedValue({
      config: {
        id: 1,
        selectedModel: "gpt-4o-mini",
        providerEndpoint: undefined,
        createdAt: "2025-01-01T00:00:00Z",
        updatedAt: "2025-01-01T00:00:00Z",
      },
      availableModels: ["gpt-4o-mini"],
    });

    let resolveUpdate: () => void;
    const updatePromise = new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    });
    vi.mocked(apiClient.updateConfig).mockReturnValue(
      updatePromise as Promise<never>,
    );

    const { container } = renderWithQueryClient(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
    });

    const saveButton = screen.getByRole("button", {
      name: /save configuration/i,
    });
    saveButton.click();

    await waitFor(() => {
      const overlay = container.querySelector(".bg-black\\/20");
      expect(overlay).toBeInTheDocument();
    });

    resolveUpdate!();

    await waitFor(() => {
      const overlay = container.querySelector(".bg-black\\/20");
      expect(overlay).not.toBeInTheDocument();
    });
  });
});
