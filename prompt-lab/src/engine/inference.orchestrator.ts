
import type {
  ConversationInput,
  SuggestionResult,
} from "../types/conversation.types.js";

import {
  SuggestionResultSchema,
} from "../schemas/response.schema.js";

import {
  ConversationAnalyzer,
} from "./conversation.analyzer.js";

import {
  ResponseGenerator,
} from "./response.generator.js";

export class InferenceOrchestrator {
  constructor(
    private readonly analyzer: ConversationAnalyzer,
    private readonly generator: ResponseGenerator,
  ) {}

  async execute(
    input: ConversationInput,
  ): Promise<SuggestionResult> {
    // Step 1: Analyze the conversation.
    const context = await this.analyzer.analyze(input);

    // Step 2: Generate suggestions using the analyzed context.
    const suggestions = await this.generator.generate(
      input,
      context,
    );

    // Step 3: Combine both outputs.
    const result = {
      context,
      suggestions,
    };

    // Step 4: Validate the complete inference result.
    const validation = SuggestionResultSchema.safeParse(result);

    if (!validation.success) {
      throw new Error(
        "The inference pipeline produced an invalid suggestion result.",
        {
          cause: validation.error,
        },
      );
    }

    return validation.data;
  }
}
