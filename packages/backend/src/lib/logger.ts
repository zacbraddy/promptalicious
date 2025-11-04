import pino from "pino";

import { config } from "../config/index.js";

export const logger = pino({
  level: config.logging.level,
  transport: config.isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});
