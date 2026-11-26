
import type {
  AICompletionOptions,
  AIProvider,
} from "../providers/provider.interface.js";

import type {
  ConversationContext,
  ConversationInput,
} from "../types/conversation.types.js";

import { ConversationContextSchema } from "../schemas/response.schema.js";

import { buildAnalyzerMessages } from "../prompts/prompt.builder.js";

export class AIResponseParseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIResponseParseError";
  }
}

export interface ConversationAnalyzerOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export class ConversationAnalyzer {
  constructor(
    private readonly provider: AIProvider,
    private readonly options: ConversationAnalyzerOptions,
  ) {}

  async analyze(
    input: ConversationInput,
  ): Promise<ConversationContext> {
    const completionOptions: AICompletionOptions = {
      messages: buildAnalyzerMessages(input),
      model: this.options.model,
      temperature: this.options.temperature ?? 0.1,
      maxTokens: this.options.maxTokens ?? 500,
      responseFormat: "json",
    };

    const result = await this.provider.generate(completionOptions);

    let parsed: unknown;

    try {
      parsed = JSON.parse(result.content);
    } catch (error: unknown) {
      throw new AIResponseParseError(
        "The AI provider returned invalid JSON for conversation analysis.",
        error,
      );
    }

    const validation = ConversationContextSchema.safeParse(parsed);

    if (!validation.success) {
      throw new AIResponseParseError(
        "The AI provider returned a conversation context with an invalid structure.",
        validation.error,
      );
    }

    return validation.data;
  }
}
