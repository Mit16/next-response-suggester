import { describe, expect, it } from "vitest";

import {
  getVibePrompt,
  VIBE_PROMPTS,
} from "./vibe.prompts.js";

import type { ConversationVibe } from "../types/conversation.types.js";

const EXPECTED_VIBES: ConversationVibe[] = [
  "normal",
  "funny",
  "playful",
  "flirty",
  "romantic",
  "sarcastic",
  "caring",
  "confident",
  "professional",
];

describe("VIBE_PROMPTS", () => {
  it("should define guidance for all supported vibes", () => {
    expect(Object.keys(VIBE_PROMPTS).sort()).toEqual(
      [...EXPECTED_VIBES].sort(),
    );
  });

  it.each(EXPECTED_VIBES)(
    "should return non-empty guidance for %s",
    (vibe) => {
      expect(getVibePrompt(vibe).trim().length).toBeGreaterThan(0);
    },
  );

  it("should return the exact guidance mapped to a vibe", () => {
    expect(getVibePrompt("caring")).toBe(VIBE_PROMPTS.caring);
  });

  it("should provide distinct guidance for different vibes", () => {
    expect(getVibePrompt("funny")).not.toBe(
      getVibePrompt("professional"),
    );
  });
});