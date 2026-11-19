
import type {
  AICompletionOptions,
  AIProvider,
} from "../providers/provider.interface.js";

import type {
  GenerationSafety,
} from "../types/safety.types.js";

import type {
  ConversationContext,
  ConversationInput,
  ConversationVibe,
  ResponseSuggestion,
} from "../types/conversation.types.js";

import {
  SuggestionsOutputSchema,
} from "../schemas/response.schema.js";

import {
  buildGeneratorMessages,
} from "../prompts/prompt.builder.js";

import {
  AIResponseParseError,
} from "./conversation.analyzer.js";

export interface ResponseGeneratorOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export class ResponseGenerator {
  constructor(
    private readonly provider: AIProvider,
    private readonly options: ResponseGeneratorOptions,
  ) { }

  async generate(
    input: ConversationInput,
    context: ConversationContext,
    safety?: GenerationSafety,
  ): Promise<ResponseSuggestion[]> {
    const completionOptions: AICompletionOptions = {
      messages: buildGeneratorMessages(input, context, safety),
      model: this.options.model,
      temperature: this.options.temperature ?? 0.7,
      maxTokens: this.options.maxTokens ?? 1200,
      responseFormat: "json",
    };

    const result = await this.provider.generate(completionOptions);

    let parsed: unknown;

    try {
      parsed = JSON.parse(result.content);
    } catch (error: unknown) {
      throw new AIResponseParseError(
        "The AI provider returned invalid JSON for response generation.",
        error,
      );
    }

    const validation = SuggestionsOutputSchema.safeParse(parsed);

    if (!validation.success) {
      throw new AIResponseParseError(
        "The AI provider returned suggestions with an invalid structure.",
        validation.error,
      );
    }

    return validation.data.suggestions;
  }
}
