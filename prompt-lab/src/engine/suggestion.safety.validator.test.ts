
import { describe, expect, it } from "vitest";

import {
  SuggestionSafetyValidator,
} from "./suggestion.safety.validator.js";

import type {
  ResponseSuggestion,
} from "../types/conversation.types.js";

import type {
  GenerationSafety,
} from "../types/safety.types.js";

const validator = new SuggestionSafetyValidator();

const baseSuggestion: ResponseSuggestion = {
  text: "That sounds interesting. Tell me more about it.",
  vibe: "normal",
  explanation: "A natural continuation.",
};

const romanticRejectionSafety: GenerationSafety = {
  blockedVibes: ["flirty", "romantic"],
  constraints: [
    "Do not pursue romantic or flirtatious interaction.",
  ],
  signals: ["romantic_rejection"],
};

const emotionalDistressSafety: GenerationSafety = {
  blockedVibes: [
    "funny",
    "sarcastic",
    "flirty",
    "romantic",
  ],
  constraints: [
    "Respond with empathy and emotional sensitivity.",
  ],
  signals: ["emotional_distress"],
};

const noRestrictions: GenerationSafety = {
  blockedVibes: [],
  constraints: [],
  signals: [],
};

function createSuggestion(
  text: string,
  vibe: ResponseSuggestion["vibe"] = "normal",
): ResponseSuggestion {
  return {
    ...baseSuggestion,
    text,
    vibe,
  };
}

describe("SuggestionSafetyValidator", () => {
  it("should allow a normal respectful suggestion", () => {
    const result = validator.validate(
      baseSuggestion,
      romanticRejectionSafety,
    );

    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("should detect romantic pursuit after rejection", () => {
    const suggestion = createSuggestion(
      "I know you said no, but give us a chance.",
      "normal",
    );

    const result = validator.validate(
      suggestion,
      romanticRejectionSafety,
    );

    expect(result.valid).toBe(false);
    expect(result.violations).toContain("romantic_pursuit");
  });

  it("should not block ordinary friendship conversation after rejection", () => {
    const suggestion = createSuggestion(
      "I respect that. Hope we can still have a good friendship.",
    );

    const result = validator.validate(
      suggestion,
      romanticRejectionSafety,
    );

    expect(result.valid).toBe(true);
  });

  it("should detect inappropriate humor during emotional distress", () => {
    const suggestion = createSuggestion(
      "Haha, don't be sad.",
    );

    const result = validator.validate(
      suggestion,
      emotionalDistressSafety,
    );

    expect(result.valid).toBe(false);
    expect(result.violations).toContain("inappropriate_humor");
  });

  it("should allow a caring response during emotional distress", () => {
    const suggestion = createSuggestion(
      "I'm sorry you're going through this. I'm here to listen.",
      "caring",
    );

    const result = validator.validate(
      suggestion,
      emotionalDistressSafety,
    );

    expect(result.valid).toBe(true);
  });

  it("should detect coercive language regardless of signals", () => {
    const suggestion = createSuggestion(
      "You owe me an explanation.",
    );

    const result = validator.validate(
      suggestion,
      noRestrictions,
    );

    expect(result.valid).toBe(false);
    expect(result.violations).toContain("pressure_or_coercion");
  });

  it("should detect disrespect for boundaries", () => {
    const suggestion = createSuggestion(
      "I won't give up on you.",
    );

    const result = validator.validate(
      suggestion,
      romanticRejectionSafety,
    );

    expect(result.valid).toBe(false);
    expect(result.violations).toContain("boundary_disrespect");
  });

  it("should not flag romantic language when no rejection exists", () => {
    const suggestion = createSuggestion(
      "Would you like to go on a date with me?",
      "flirty",
    );

    const result = validator.validate(
      suggestion,
      noRestrictions,
    );

    expect(result.valid).toBe(true);
  });

  it("should detect multiple violations in one suggestion", () => {
    const suggestion = createSuggestion(
      "I know you said no, but give us a chance. You owe me an answer.",
    );

    const result = validator.validate(
      suggestion,
      romanticRejectionSafety,
    );

    expect(result.valid).toBe(false);
    expect(result.violations).toContain("romantic_pursuit");
    expect(result.violations).toContain("pressure_or_coercion");
  });
});
