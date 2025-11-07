import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { Layout } from "@/components/Layout";

describe("Theme Application Integration Test", () => {
  afterEach(() => {
    cleanup();
  });

  it("should render Layout component with dark theme applied", () => {
    render(
      <MemoryRouter>
        <Layout>
          <div>Test content</div>
        </Layout>
      </MemoryRouter>,
    );

    const mainElement = screen.getByRole("main");
    expect(mainElement).toBeInTheDocument();

    const headerElement = screen.getByRole("banner");
    expect(headerElement).toBeInTheDocument();

    expect(screen.getByText("Test content")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "promptalicious" }),
    ).toBeInTheDocument();
  });

  it("should apply correct background and text color classes", () => {
    const { container } = render(
      <MemoryRouter>
        <Layout>
          <div>Test content</div>
        </Layout>
      </MemoryRouter>,
    );

    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv).toHaveClass("bg-background");
    expect(rootDiv).toHaveClass("text-foreground");
    expect(rootDiv).toHaveClass("min-h-screen");
  });

  it("should apply primary color to header title", () => {
    render(
      <MemoryRouter>
        <Layout>
          <div>Test content</div>
        </Layout>
      </MemoryRouter>,
    );

    const title = screen.getByRole("heading", { name: "promptalicious" });
    expect(title).toHaveClass("text-primary");
  });

  it("should apply border styling to header", () => {
    render(
      <MemoryRouter>
        <Layout>
          <div>Test content</div>
        </Layout>
      </MemoryRouter>,
    );

    const headerElement = screen.getByRole("banner");
    expect(headerElement).toHaveClass("border-b");
    expect(headerElement).toHaveClass("border-border");
  });

  it("should have CSS variable-based theming structure (verify bg-background class applies)", () => {
    const { container } = render(
      <MemoryRouter>
        <Layout>
          <div>Test content</div>
        </Layout>
      </MemoryRouter>,
    );

    const rootDiv = container.firstChild as HTMLElement;

    expect(rootDiv).toHaveClass("bg-background");
    expect(rootDiv).toHaveClass("text-foreground");
  });
});
