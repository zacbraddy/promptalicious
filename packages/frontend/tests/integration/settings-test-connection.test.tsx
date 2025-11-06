import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import MockAdapter from "axios-mock-adapter";
import type {
  ConfigurationResponse,
  TestConnectionResponse,
} from "@promptalicious/shared-infra";

import { SettingsPage } from "@/pages/SettingsPage";
import { apiClient } from "@/services/apiClient";

describe("Settings Test Connection Integration Test", () => {
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

  it("should test connection without saving configuration", async () => {
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

    const mockTestConnectionSuccess: TestConnectionResponse = {
      success: true,
      message: "Connection successful",
    };

    let getConfigCallCount = 0;
    mock.onGet("/config").reply(() => {
      getConfigCallCount++;
      return [200, mockInitialConfig];
    });

    mock
      .onPost("/config/test-connection")
      .reply(200, mockTestConnectionSuccess);

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
    });

    const apiKeyInput = screen.getByLabelText(/API Key/i);
    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, "sk-test-new-api-key-12345");

    const testConnectionButton = screen.getByRole("button", {
      name: /Test Connection/i,
    });
    await user.click(testConnectionButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Connection test successful/i),
      ).toBeInTheDocument();
    });

    expect(getConfigCallCount).toBe(1);
  });

  it("should show loading state during test connection", async () => {
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

    const mockTestConnectionSuccess: TestConnectionResponse = {
      success: true,
      message: "Connection successful",
    };

    mock.onGet("/config").reply(200, mockConfig);

    mock.onPost("/config/test-connection").reply(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([200, mockTestConnectionSuccess]);
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

    const testConnectionButton = screen.getByRole("button", {
      name: /Test Connection/i,
    });
    await user.click(testConnectionButton);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Testing.../i }),
      ).toBeDisabled();
    });

    await waitFor(
      () => {
        expect(
          screen.getByRole("button", { name: /Test Connection/i }),
        ).not.toBeDisabled();
      },
      { timeout: 3000 },
    );
  });

  it("should display error message when test connection fails", async () => {
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

    const mockTestConnectionError = {
      error: {
        errorMessage: "Connection failed: Invalid API key",
        errorType: "authentication",
        errorCode: "invalid_api_key",
      },
    };

    mock.onGet("/config").reply(200, mockConfig);
    mock.onPost("/config/test-connection").reply(401, mockTestConnectionError);

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
    });

    const apiKeyInput = screen.getByLabelText(/API Key/i);
    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, "sk-invalid-key");

    const testConnectionButton = screen.getByRole("button", {
      name: /Test Connection/i,
    });
    await user.click(testConnectionButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Connection failed: Invalid API key/i),
      ).toBeInTheDocument();
    });
  });

  it("should verify configuration NOT saved after test connection", async () => {
    const user = userEvent.setup();

    const originalTimestamp = new Date("2025-01-01T00:00:00Z").toISOString();

    const mockInitialConfig: ConfigurationResponse = {
      config: {
        id: 1,
        selectedModel: "gpt-4o-mini",
        baseURL: undefined,
        createdAt: originalTimestamp,
        updatedAt: originalTimestamp,
      },
      availableModels: ["gpt-4o-mini"],
    };

    const mockTestConnectionSuccess: TestConnectionResponse = {
      success: true,
      message: "Connection successful",
    };

    let getConfigCallCount = 0;
    mock.onGet("/config").reply(() => {
      getConfigCallCount++;
      return [200, mockInitialConfig];
    });

    mock
      .onPost("/config/test-connection")
      .reply(200, mockTestConnectionSuccess);

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
    });

    const apiKeyInput = screen.getByLabelText(/API Key/i);
    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, "sk-test-different-key");

    const testConnectionButton = screen.getByRole("button", {
      name: /Test Connection/i,
    });
    await user.click(testConnectionButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Connection test successful/i),
      ).toBeInTheDocument();
    });

    expect(getConfigCallCount).toBe(1);
  });

  it("should allow test connection with modified base URL", async () => {
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

    const mockTestConnectionSuccess: TestConnectionResponse = {
      success: true,
      message: "Connection successful with custom endpoint",
    };

    mock.onGet("/config").reply(200, mockConfig);
    mock
      .onPost("/config/test-connection")
      .reply(200, mockTestConnectionSuccess);

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
    });

    const apiKeyInput = screen.getByLabelText(/API Key/i);
    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, "sk-test-key");

    const providerEndpointInput = screen.getByLabelText(/Provider Endpoint/i);
    await user.clear(providerEndpointInput);
    await user.type(
      providerEndpointInput,
      "https://custom.openai.endpoint.com",
    );

    const testConnectionButton = screen.getByRole("button", {
      name: /Test Connection/i,
    });
    await user.click(testConnectionButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Connection test successful/i),
      ).toBeInTheDocument();
    });
  });

  it("should test connection with current saved configuration when no changes made", async () => {
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

    const mockTestConnectionSuccess: TestConnectionResponse = {
      success: true,
      message: "Connection successful with existing configuration",
    };

    mock.onGet("/config").reply(200, mockConfig);
    mock
      .onPost("/config/test-connection")
      .reply(200, mockTestConnectionSuccess);

    renderSettingsPage();

    await waitFor(() => {
      expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument();
    });

    const testConnectionButton = screen.getByRole("button", {
      name: /Test Connection/i,
    });
    await user.click(testConnectionButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Connection test successful/i),
      ).toBeInTheDocument();
    });
  });
});
