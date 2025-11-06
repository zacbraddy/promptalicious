interface Config {
  apiBaseUrl: string;
}

function validateConfig(): Config {
  const apiBaseUrl =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
    "http://localhost:3000/api";

  if (typeof apiBaseUrl !== "string") {
    throw new Error("VITE_API_BASE_URL must be a string");
  }

  try {
    new URL(apiBaseUrl);
  } catch {
    throw new Error(`VITE_API_BASE_URL must be a valid URL: ${apiBaseUrl}`);
  }

  return {
    apiBaseUrl,
  };
}

export const config = validateConfig();
