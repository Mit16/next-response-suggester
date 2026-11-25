
import type {
  ConversationContext,
  ConversationInput,
  SuggestionResult,
} from "../types/conversation.types.js";

import type {
  GenerationFeedback,
  GenerationSafety,
} from "../types/safety.types.js";

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

import {
  SuggestionSafetyValidator,
  type SafetyViolation,
} from "./suggestion.safety.validator.js";

const MAX_REGENERATION_ATTEMPTS = 2;

export class SuggestionSafetyError extends Error {
  constructor(
    public readonly attempts: number,
    public readonly violations: SafetyViolation[],
  ) {
    super(
      `Generated suggestions failed safety validation after ${attempts} attempts.`,
    );

    this.name = "SuggestionSafetyError";
  }
}

export class InferenceOrchestrator {
  constructor(
    private readonly analyzer: ConversationAnalyzer,
    private readonly generator: ResponseGenerator,
    private readonly safetyPolicy: SafetyPolicy = new SafetyPolicy(),
    private readonly suggestionSafetyValidator: SuggestionSafetyValidator =
      new SuggestionSafetyValidator(),
  ) { }

  async execute(
    input: ConversationInput,
  ): Promise<SuggestionResult> {
    // Step 1: Analyze the original conversation.
    const context = await this.analyzer.analyze(input);

    // Step 2: Evaluate conversation safety.
    const safetyDecision = this.safetyPolicy.evaluate(
      input,
      context,
    );

    // Step 3: Stop when explicit no-contact is detected.
    if (safetyDecision.action === "no_action") {
      return this.validateResult({
        status: "no_action",
        context,
        reason: safetyDecision.reason,
      });
    }

    // Step 4: Apply safety-adjusted generation preferences.
    const effectiveInput: ConversationInput = {
      ...input,
      requestedVibe: safetyDecision.effectiveVibe,
      requestedGoal: safetyDecision.effectiveGoal,
    };

    // Step 5: Prepare generation safety metadata.
    const generationSafety: GenerationSafety = {
      blockedVibes: safetyDecision.blockedVibes,
      constraints: safetyDecision.constraints,
      signals: safetyDecision.signals,
    };

    // Step 6: Generate and validate suggestions.
    const suggestions = await this.generateSafeSuggestions(
      effectiveInput,
      context,
      generationSafety,
    );

    // Step 7: Validate the complete result contract.
    return this.validateResult({
      status: "suggestions",
      context,
      suggestions,
    });
  }

  /**
   * Generates a complete set of suggestions and validates every item.
   *
   * Initial generation + at most two regeneration attempts.
   */
  private async generateSafeSuggestions(
    input: ConversationInput,
    context: ConversationContext,
    safety: GenerationSafety,
  ) {
    let feedback: GenerationFeedback | undefined;
    let lastViolations: SafetyViolation[] = [];

    for (
      let attempt = 0;
      attempt <= MAX_REGENERATION_ATTEMPTS;
      attempt++
    ) {
      // Generate a complete set of three suggestions.
      const suggestions = await this.generator.generate(
        input,
        context,
        safety,
        feedback,
      );

      // Validate every suggestion in the generated set.
      const validationResults = suggestions.map((suggestion) =>
        this.suggestionSafetyValidator.validate(
          suggestion,
          safety,
        ),
      );

      const violations = [
        ...new Set(
          validationResults.flatMap(
            (result) => result.violations,
          ),
        ),
      ];

      // Return only when every suggestion passes validation.
      if (validationResults.every((result) => result.valid)) {
        return suggestions;
      }

      lastViolations = violations;

      // No more regeneration attempts remain.
      if (attempt === MAX_REGENERATION_ATTEMPTS) {
        break;
      }

      // Prepare corrective feedback for the next generation.
      feedback = {
        attempt: attempt + 1,
        violations,
      };
    }

    throw new SuggestionSafetyError(
      MAX_REGENERATION_ATTEMPTS + 1,
      lastViolations,
    );
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
