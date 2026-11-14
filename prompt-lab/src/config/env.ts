import "dotenv/config";

import { z } from "zod";

const EnvSchema = z.object({
  GROQ_API_KEY: z.string().trim().min(1, "GROQ_API_KEY is required"),

  GROQ_MODEL: z.string().trim().min(1, "GROQ_MODEL is required"),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
    .default("debug"),
});

function loadEnvironment() {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Environment configuration is invalid:\n${errors}`,
    );
  }

  return Object.freeze(result.data);
}

export const env = loadEnvironment();

export type Environment = typeof env;