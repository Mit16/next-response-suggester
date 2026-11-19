
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

import {
  SafetyPolicy,
} from "./safety.policy.js";

export class InferenceOrchestrator {
  constructor(
    private readonly analyzer: ConversationAnalyzer,
    private readonly generator: ResponseGenerator,
    private readonly safetyPolicy: SafetyPolicy = new SafetyPolicy(),
  ) { }

  async execute(
    input: ConversationInput,
  ): Promise<SuggestionResult> {
    // Step 1: Analyze the conversation.
    const context = await this.analyzer.analyze(input);

    // Step 2: Evaluate safety before generating suggestions.
    const safetyDecision = this.safetyPolicy.evaluate(
      input,
      context,
    );

    // Step 3: Stop generation when explicit no-contact is detected.
    if (safetyDecision.action === "no_action") {
      const result = {
        status: "no_action" as const,
        context,
        reason: safetyDecision.reason,
      };

      return this.validateResult(result);
    }

    // Step 4: Apply safety-adjusted generation preferences.
    const effectiveInput: ConversationInput = {
      ...input,
      requestedVibe: safetyDecision.effectiveVibe,
      requestedGoal: safetyDecision.effectiveGoal,
    };

    // Step 5: Build the generation safety metadata.
    const generationSafety = {
      blockedVibes: safetyDecision.blockedVibes,
      constraints: safetyDecision.constraints,
      signals: safetyDecision.signals,
    };

    // Step 6: Generate suggestions with safety constraints.
    const suggestions = await this.generator.generate(
      effectiveInput,
      context,
      generationSafety,
    );

    // Step 7: Combine and validate the complete result.
    const result = {
      status: "suggestions" as const,
      context,
      suggestions,
    };

    return this.validateResult(result);
  }

  /**
   * Validates the final result against the shared result contract.
   */
  private validateResult(
    result: unknown,
  ): SuggestionResult {
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
