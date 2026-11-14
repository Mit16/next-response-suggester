import Groq from "groq-sdk";

import {
  AIProviderError,
  type AICompletionOptions,
  type AICompletionResult,
  type AIProvider,
} from "./provider.interface.js";

export class GroqProvider implements AIProvider {
  readonly name = "groq";

  private readonly client: Groq;

  constructor(apiKey: string) {
    if (!apiKey.trim()) {
      throw new AIProviderError(
        "Groq API key is missing.",
        this.name,
        false,
      );
    }

    this.client = new Groq({ apiKey });
  }

  async generate(
    options: AICompletionOptions,
  ): Promise<AICompletionResult> {
    try {
      if (!options.model.trim()) {
        throw new AIProviderError(
          "Model name cannot be empty.",
          this.name,
          false,
        );
      }

      if (options.messages.length === 0) {
        throw new AIProviderError(
          "At least one message is required.",
          this.name,
          false,
        );
      }

      const response = await this.client.chat.completions.create({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        response_format:
          options.responseFormat === "json"
            ? { type: "json_object" }
            : { type: "text" },
      });

      const choice = response.choices[0];

      if (!choice?.message.content) {
        throw new AIProviderError(
          "Groq returned an empty response.",
          this.name,
          false,
        );
      }

      return {
        content: choice.message.content,
        model: response.model,
        finishReason: choice.finish_reason,
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens:
            response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
      };
    } catch (error: unknown) {
      if (error instanceof AIProviderError) {
        throw error;
      }

      const statusCode =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof error.status === "number"
          ? error.status
          : undefined;

      const retryable =
        statusCode === 408 ||
        statusCode === 409 ||
        statusCode === 429 ||
        (statusCode !== undefined && statusCode >= 500) ||
        statusCode === undefined;

      const message =
        error instanceof Error
          ? error.message
          : "An unknown error occurred.";

      throw new AIProviderError(
        `Groq request failed: ${message}`,
        this.name,
        retryable,
        statusCode,
      );
    }
  }
}