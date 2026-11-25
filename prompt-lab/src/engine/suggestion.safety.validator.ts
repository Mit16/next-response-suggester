
import type {
  ResponseSuggestion,
} from "../types/conversation.types.js";

import type {
  GenerationSafety,
} from "../types/safety.types.js";

export type SafetyViolation =
  | "blocked_vibe"
  | "romantic_pursuit"
  | "inappropriate_humor"
  | "pressure_or_coercion"
  | "boundary_disrespect";

export interface SuggestionSafetyResult {
  valid: boolean;
  violations: SafetyViolation[];
}

const ROMANTIC_PURSUIT_PATTERNS: RegExp[] = [
  /\bgo\s+on\s+a\s+date\s+with\s+me\b/i,
  /\bgive\s+us\s+a\s+chance\b/i,
  /\byou(?:'ll| will)\s+change\s+your\s+mind\b/i,
  /\bi(?:'ll| will)\s+make\s+you\s+fall\s+for\s+me\b/i,
  /\bplease\s+reconsider\s+(?:us|dating|a\s+relationship)\b/i,
  /\bi\s+know\s+you\s+said\s+no\s*,?\s*but\b/i,
  /\bwhy\s+won't\s+you\s+give\s+me\s+a\s+chance\b/i,
];

const INAPPROPRIATE_HUMOR_PATTERNS: RegExp[] = [
  /\b(?:haha|lol|lmao)\b/i,
  /\bjust\s+kidding\b/i,
  /\bthat's\s+funny\b/i,
  /\b(?:cheer\s+up|don't\s+be\s+sad)\b/i,
];

const PRESSURE_PATTERNS: RegExp[] = [
  /\byou\s+owe\s+me\b/i,
  /\byou\s+have\s+to\s+(?:reply|answer|meet|explain)\b/i,
  /\bi\s+won't\s+take\s+no\s+for\s+an\s+answer\b/i,
  /\bif\s+you\s+(?:really\s+)?cared\s*,?\s*you(?:'d| would)\b/i,
  /\bstop\s+ignoring\s+me\b/i,
];

const BOUNDARY_DISRESPECT_PATTERNS: RegExp[] = [
  /\bi(?:'ll| will)\s+keep\s+(?:trying|asking|messaging)\b/i,
  /\bi\s+won't\s+give\s+up\s+on\s+you\b/i,
  /\byou(?:'re| are)\s+just\s+confused\b/i,
  /\byou\s+don't\s+know\s+what\s+you\s+want\b/i,
];

function matchesAny(
  text: string,
  patterns: RegExp[],
): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export class SuggestionSafetyValidator {
  validate(
    suggestion: ResponseSuggestion,
    safety: GenerationSafety,
  ): SuggestionSafetyResult {
    const violations = new Set<SafetyViolation>();
    const text = suggestion.text;

    // Rule 1: The declared vibe must not be blocked.
    if (safety.blockedVibes.includes(suggestion.vibe)) {
      violations.add("blocked_vibe");
    }

    // Rule 2: Romantic pursuit is prohibited after rejection.
    if (
      safety.signals.includes("romantic_rejection") &&
      matchesAny(text, ROMANTIC_PURSUIT_PATTERNS)
    ) {
      violations.add("romantic_pursuit");
    }

    // Rule 3: Inappropriate humor is prohibited during distress.
    if (
      safety.signals.includes("emotional_distress") &&
      matchesAny(text, INAPPROPRIATE_HUMOR_PATTERNS)
    ) {
      violations.add("inappropriate_humor");
    }

    // Rule 4: Coercive language is always prohibited.
    if (matchesAny(text, PRESSURE_PATTERNS)) {
      violations.add("pressure_or_coercion");
    }

    // Rule 5: Disrespecting boundaries is always prohibited.
    if (matchesAny(text, BOUNDARY_DISRESPECT_PATTERNS)) {
      violations.add("boundary_disrespect");
    }

    return {
      valid: violations.size === 0,
      violations: [...violations],
    };
  }
}
