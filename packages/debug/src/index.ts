export type DebugMessage = {
  timestamp: Date;
  message: string;
  variables?: Record<string, unknown>;
};

let captureEnabled = false;
let currentCaptures: DebugMessage[] = [];

export function capturelicious(
  message: string,
  variables?: Record<string, unknown>,
): void {
  const entry: DebugMessage = {
    timestamp: new Date(),
    message,
    variables,
  };

  if (captureEnabled) {
    currentCaptures.push(entry);
  } else {
    console.log(`[capturelicious] ${message}`, variables);
  }
}

export function enableCapture(): void {
  captureEnabled = true;
  currentCaptures = [];
}

export function disableCapture(): void {
  captureEnabled = false;
}

export function getCaptures(): DebugMessage[] {
  return [...currentCaptures];
}

export function clearCaptures(): void {
  currentCaptures = [];
}
