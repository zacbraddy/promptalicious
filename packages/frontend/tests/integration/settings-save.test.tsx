import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import MockAdapter from "axios-mock-adapter";
import type {
  ConfigurationResponse,
  UpdateConfigurationSuccessResponse,
  UpdateConfigurationErrorResponse,
} from "@promptalicious/shared-infra";

import { SettingsPage } from "@/pages/SettingsPage";
import { apiClient } from "@/services/apiClient";

describe("Settings Form Save and Validation Integration Test", () => {
  let queryClient: QueryClient;
  let mock: MockAdapter;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    mock = new MockAdapter(apiClient);
  });

  afterEach(() => {
    mock.restore();
    cleanup();
  });

  function renderSettingsPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SettingsPage />
          <Toaster />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it("should load settings page and display initial configuration", async () => {
    const mockConfig: ConfigurationResponse = {
      config: {
        id: 1,
        selectedModel: "gpt-4o-mini",
        baseURL: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      availableModels: ["gpt-4o-mini"],
    };

    mock.onGet("/config").reply(200, mockConfig);

    renderSettingsPage();

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(
      screen.getByText(/Configure your LLM provider settings/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByRole("combobox", { name: /Model/i }),
      ).toBeInTheDocument();
    });
  });

  it("should enter valid API key and save configuration successfully", async () => {
    const user = userEvent.setup();

    const mockInitialConfig: ConfigurationResponse = {
      config: {
        id: 1,
        selectedModel: "gpt-4o-mini",
        baseURL: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      availableModels: ["gpt-4o-mini"],
    };

    const mockUpdateResponse: UpdateConfigurationSuccessResponse = {
      message: "Configuration updated successfully",
      config: {
        id: 1,
        selectedModel: "gpt-4o-mini",
        baseURL: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      validationResult: {
        success: true,
      },
    };

    mock.onGet("/config").reply(200, mockInitialConfig);
    mock.onPut("/config").reply(200, mockUpdateResponse);

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
    });

    const apiKeyInput = screen.getByLabelText(/API Key/i);
    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, "sk-test-valid-api-key-12345");

    const saveButton = screen.getByRole("button", {
      name: /Save Configuration/i,
    });
    await user.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Configuration saved and validated successfully/i),
      ).toBeInTheDocument();
    });
  });

  it("should show loading state during save operation", async () => {
    const user = userEvent.setup();

    const mockConfig: ConfigurationResponse = {
      config: {
        id: 1,
        selectedModel: "gpt-4o-mini",
        baseURL: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      availableModels: ["gpt-4o-mini"],
    };

    const mockUpdateResponse: UpdateConfigurationSuccessResponse = {
      message: "Configuration updated successfully",
      config: {
        id: 1,
        selectedModel: "gpt-4o-mini",
        baseURL: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      validationResult: {
        success: true,
      },
    };

    mock.onGet("/config").reply(200, mockConfig);

    mock.onPut("/config").reply(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([200, mockUpdateResponse]);
        }, 500);
      });
    });

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
    });

    const apiKeyInput = screen.getByLabelText(/API Key/i);
    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, "sk-test-key");

    const saveButton = screen.getByRole("button", {
      name: /Save Configuration/i,
    });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Saving.../i })).toBeDisabled();
    });

    await waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: /Save Configuration/i }),
        ).not.toBeDisabled();
      },
      { timeout: 3000 },
    );
  });

  it("should display error message when save fails", async () => {
    const user = userEvent.setup();

    const mockConfig: ConfigurationResponse = {
      config: {
        id: 1,
        selectedModel: "gpt-4o-mini",
        baseURL: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      availableModels: ["gpt-4o-mini"],
    };

    const mockErrorResponse: UpdateConfigurationErrorResponse = {
      error: {
        errorMessage: "Invalid API key: Authentication failed",
        errorType: "authentication",
      },
    };

    mock.onGet("/config").reply(200, mockConfig);
    mock.onPut("/config").reply(401, mockErrorResponse);

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
    });

    const apiKeyInput = screen.getByLabelText(/API Key/i);
    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, "sk-invalid-key");

    const saveButton = screen.getByRole("button", {
      name: /Save Configuration/i,
    });
    await user.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Invalid API key: Authentication failed/i),
      ).toBeInTheDocument();
    });
  });

  it("should verify configuration persisted via GET /config after save", async () => {
    const user = userEvent.setup();

    const mockInitialConfig: ConfigurationResponse = {
      config: {
        id: 1,
        selectedModel: "gpt-4o-mini",
        baseURL: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      availableModels: ["gpt-4o-mini"],
    };

    const mockUpdatedConfig: ConfigurationResponse = {
      config: {
        id: 1,
        selectedModel: "gpt-4o-mini",
        baseURL: undefined,
        createdAt: mockInitialConfig.config.createdAt,
        updatedAt: new Date().toISOString(),
      },
      availableModels: ["gpt-4o-mini"],
    };

    const mockUpdateResponse: UpdateConfigurationSuccessResponse = {
      message: "Configuration updated successfully",
      config: mockUpdatedConfig.config,
      validationResult: {
        success: true,
      },
    };

    let getConfigCallCount = 0;
    mock.onGet("/config").reply(() => {
      getConfigCallCount++;
      if (getConfigCallCount === 1) {
        return [200, mockInitialConfig];
      }
      return [200, mockUpdatedConfig];
    });

    mock.onPut("/config").reply(200, mockUpdateResponse);

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
    });

    const apiKeyInput = screen.getByLabelText(/API Key/i);
    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, "sk-new-api-key");

    const saveButton = screen.getByRole("button", {
      name: /Save Configuration/i,
    });
    await user.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Configuration saved and validated successfully/i),
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(getConfigCallCount).toBeGreaterThanOrEqual(2);
    });
  });
});
