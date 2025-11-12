import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  capturelicious,
  clearCaptures,
  disableCapture,
  enableCapture,
  getCaptures,
} from "@/index";

describe("capturelicious", () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let consoleLogSpy: any;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  beforeEach(() => {
    disableCapture();
    clearCaptures();
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    consoleLogSpy.mockRestore();
    /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  });

  describe("when capture is disabled", () => {
    it("should log to console with message and variables", () => {
      const message = "Test message";
      const variables = { foo: "bar", count: 42 };

      capturelicious(message, variables);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `[capturelicious] ${message}`,
        variables,
      );
    });

    it("should log to console with message only when no variables provided", () => {
      const message = "Test message without variables";

      capturelicious(message);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        `[capturelicious] ${message}`,
        undefined,
      );
    });

    it("should not add entries to captures array", () => {
      capturelicious("Test message", { foo: "bar" });

      const captures = getCaptures();
      expect(captures).toHaveLength(0);
    });
  });

  describe("when capture is enabled", () => {
    beforeEach(() => {
      enableCapture();
    });

    it("should capture message and variables", () => {
      const message = "Captured message";
      const variables = { userId: "123", action: "login" };

      capturelicious(message, variables);

      const captures = getCaptures();
      expect(captures).toHaveLength(1);
      expect(captures[0]!).toMatchObject({
        message,
        variables,
      });
      expect(captures[0]!.timestamp).toBeInstanceOf(Date);
    });

    it("should capture message without variables", () => {
      const message = "Simple message";

      capturelicious(message);

      const captures = getCaptures();
      expect(captures).toHaveLength(1);
      expect(captures[0]!).toMatchObject({
        message,
        variables: undefined,
      });
    });

    it("should not log to console", () => {
      capturelicious("Test message", { foo: "bar" });

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it("should accumulate multiple captures", () => {
      capturelicious("First message", { step: 1 });
      capturelicious("Second message", { step: 2 });
      capturelicious("Third message", { step: 3 });

      const captures = getCaptures();
      expect(captures).toHaveLength(3);
      expect(captures[0]!.message).toBe("First message");
      expect(captures[1]!.message).toBe("Second message");
      expect(captures[2]!.message).toBe("Third message");
    });

    it("should maintain chronological order of captures", () => {
      const start = Date.now();

      capturelicious("First");
      capturelicious("Second");

      const captures = getCaptures();
      const first = captures[0]!.timestamp.getTime();
      const second = captures[1]!.timestamp.getTime();

      expect(first).toBeGreaterThanOrEqual(start);
      expect(second).toBeGreaterThanOrEqual(first);
    });
  });

  describe("enableCapture", () => {
    it("should enable capture mode", () => {
      disableCapture();
      capturelicious("Before enable");
      expect(getCaptures()).toHaveLength(0);

      enableCapture();
      capturelicious("After enable");
      expect(getCaptures()).toHaveLength(1);
    });

    it("should clear existing captures when enabled", () => {
      enableCapture();
      capturelicious("First");
      capturelicious("Second");
      expect(getCaptures()).toHaveLength(2);

      enableCapture();
      expect(getCaptures()).toHaveLength(0);
    });
  });

  describe("disableCapture", () => {
    it("should disable capture mode", () => {
      enableCapture();
      capturelicious("Captured");
      expect(getCaptures()).toHaveLength(1);

      disableCapture();
      capturelicious("Not captured");
      expect(getCaptures()).toHaveLength(1);
    });

    it("should not clear existing captures", () => {
      enableCapture();
      capturelicious("First");
      capturelicious("Second");
      const capturesBeforeDisable = getCaptures();

      disableCapture();
      const capturesAfterDisable = getCaptures();

      expect(capturesAfterDisable).toEqual(capturesBeforeDisable);
      expect(capturesAfterDisable).toHaveLength(2);
    });
  });

  describe("getCaptures", () => {
    it("should return empty array when no captures", () => {
      enableCapture();
      const captures = getCaptures();

      expect(captures).toEqual([]);
    });

    it("should return copy of captures array", () => {
      enableCapture();
      capturelicious("Test");

      const captures1 = getCaptures();
      const captures2 = getCaptures();

      expect(captures1).toEqual(captures2);
      expect(captures1).not.toBe(captures2);
    });

    it("should not allow external mutation of captures", () => {
      enableCapture();
      capturelicious("Original");

      const captures = getCaptures();
      captures.push({
        timestamp: new Date(),
        message: "Injected",
        variables: {},
      });

      const freshCaptures = getCaptures();
      expect(freshCaptures).toHaveLength(1);
      expect(freshCaptures[0]!.message).toBe("Original");
    });
  });

  describe("clearCaptures", () => {
    it("should remove all captures", () => {
      enableCapture();
      capturelicious("First");
      capturelicious("Second");
      capturelicious("Third");
      expect(getCaptures()).toHaveLength(3);

      clearCaptures();
      expect(getCaptures()).toHaveLength(0);
    });

    it("should work when capture is disabled", () => {
      enableCapture();
      capturelicious("Test");
      disableCapture();

      clearCaptures();
      expect(getCaptures()).toHaveLength(0);
    });

    it("should allow new captures after clearing", () => {
      enableCapture();
      capturelicious("First");
      clearCaptures();
      capturelicious("Second");

      const captures = getCaptures();
      expect(captures).toHaveLength(1);
      expect(captures[0]!.message).toBe("Second");
    });
  });

  describe("integration scenarios", () => {
    it("should support typical backend integration workflow", () => {
      enableCapture();
      clearCaptures();

      capturelicious("Starting tool execution", { toolId: "getUserProfile" });
      capturelicious("Database query started", { userId: "abc123" });
      capturelicious("User found", { userName: "John Doe" });

      const captures = getCaptures();
      expect(captures).toHaveLength(3);

      disableCapture();

      expect(
        captures.every((c: { timestamp: Date }) => c.timestamp instanceof Date),
      ).toBe(true);
      expect(
        captures.every(
          (c: { message: string }) => typeof c.message === "string",
        ),
      ).toBe(true);
    });

    it("should handle rapid successive calls", () => {
      enableCapture();

      for (let i = 0; i < 100; i++) {
        capturelicious(`Message ${i}`, { index: i });
      }

      const captures = getCaptures();
      expect(captures).toHaveLength(100);
      expect(captures[50]!.message).toBe("Message 50");
    });
  });
});
