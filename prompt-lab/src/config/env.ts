
import "dotenv/config";

import { z } from "zod";

const CommonEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
    .default("debug"),
});

const GroqEnvSchema = CommonEnvSchema.extend({
  AI_PROVIDER: z.literal("groq"),

  GROQ_API_KEY: z.string().trim().min(1, "GROQ_API_KEY is required"),
  GROQ_MODEL: z.string().trim().min(1, "GROQ_MODEL is required"),

  POE_API_KEY: z.string().optional(),
  POE_MODEL: z.string().optional(),
});

const PoeEnvSchema = CommonEnvSchema.extend({
  AI_PROVIDER: z.literal("poe"),

  POE_API_KEY: z.string().trim().min(1, "POE_API_KEY is required"),
  POE_MODEL: z.string().trim().min(1, "POE_MODEL is required"),

  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().optional(),
});

const EnvSchema = z.discriminatedUnion("AI_PROVIDER", [
  GroqEnvSchema,
  PoeEnvSchema,
]);

function loadEnvironment() {
  const rawEnvironment = {
    ...process.env,
    AI_PROVIDER: process.env.AI_PROVIDER ?? "groq",
  };

  const result = EnvSchema.safeParse(rawEnvironment);

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
