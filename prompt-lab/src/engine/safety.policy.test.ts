
import { describe, expect, it } from "vitest";

import {
  SafetyPolicy,
} from "./safety.policy.js";

import type {
  ConversationContext,
  ConversationInput,
} from "../types/conversation.types.js";

const policy = new SafetyPolicy();

function createContext(
  overrides: Partial<ConversationContext> = {},
): ConversationContext {
  return {
    summary: "Two people are having a casual conversation.",
    emotionalTone: "Neutral and relaxed.",
    intent: "Continue a casual conversation.",
    engagementLevel: "moderate",
    topic: "Daily life.",
    conversationStage: "ongoing",
    conversationDirection: "The conversation can continue naturally.",
    boundarySignals: [],
    ...overrides,
  };
}

function createInput(
  messages: ConversationInput["messages"],
  overrides: Partial<ConversationInput> = {},
): ConversationInput {
  return {
    messages,
    ...overrides,
  };
}

describe("SafetyPolicy", () => {
  describe("explicit no-contact requests", () => {
    it("should return no_action when the other person requests no further contact", () => {
      const input = createInput([
        {
          role: "self",
          content: "I think we should talk.",
        },
        {
          role: "other",
          content: "Please don't message me again.",
        },
      ]);

      const decision = policy.evaluate(
        input,
        createContext(),
      );

      expect(decision.action).toBe("no_action");

      if (decision.action === "no_action") {
        expect(decision.triggeredBy).toBe(
          "explicit_no_contact",
        );
        expect(decision.reason).toBeTruthy();
      }
    });

    it("should return no_action when the context contains an explicit no-contact signal", () => {
      const input = createInput([
        {
          role: "self",
          content: "Can we talk?",
        },
        {
          role: "other",
          content: "I need some time.",
        },
      ]);

      const context = createContext({
        boundarySignals: [
          "Please stop contacting me.",
        ],
      });

      const decision = policy.evaluate(input, context);

      expect(decision.action).toBe("no_action");
    });
  });

  describe("romantic rejection", () => {
    it("should block romantic and flirty vibes after romantic rejection", () => {
      const input = createInput(
        [
          {
            role: "other",
            content: "I only see you as a friend.",
          },
        ],
        {
          requestedVibe: "flirty",
        },
      );

      const decision = policy.evaluate(
        input,
        createContext(),
      );

      expect(decision.action).toBe("allow");

      if (decision.action === "allow") {
        expect(decision.effectiveVibe).toBe("normal");
        expect(decision.blockedVibes).toContain("flirty");
        expect(decision.blockedVibes).toContain("romantic");
        expect(decision.signals).toContain(
          "romantic_rejection",
        );
      }
    });

    it("should override ask_out after romantic rejection", () => {
      const input = createInput(
        [
          {
            role: "other",
            content: "I don't want to date you.",
          },
        ],
        {
          requestedVibe: "romantic",
          requestedGoal: "ask_out",
        },
      );

      const decision = policy.evaluate(
        input,
        createContext(),
      );

      expect(decision.action).toBe("allow");

      if (decision.action === "allow") {
        expect(decision.effectiveVibe).toBe("normal");
        expect(decision.effectiveGoal).toBe(
          "continue_conversation",
        );
      }
    });
  });

  describe("emotional distress", () => {
    it("should force caring vibe when the other person expresses distress", () => {
      const input = createInput(
        [
          {
            role: "other",
            content: "I'm feeling really hopeless today.",
          },
        ],
        {
          requestedVibe: "funny",
          requestedGoal: "make_them_laugh",
        },
      );

      const decision = policy.evaluate(
        input,
        createContext(),
      );

      expect(decision.action).toBe("allow");

      if (decision.action === "allow") {
        expect(decision.effectiveVibe).toBe("caring");
        expect(decision.effectiveGoal).toBe("show_empathy");
        expect(decision.signals).toContain(
          "emotional_distress",
        );
      }
    });

    it("should block funny and sarcastic vibes during emotional distress", () => {
      const input = createInput(
        [
          {
            role: "other",
            content: "I've been crying all day.",
          },
        ],
        {
          requestedVibe: "sarcastic",
        },
      );

      const decision = policy.evaluate(
        input,
        createContext(),
      );

      expect(decision.action).toBe("allow");

      if (decision.action === "allow") {
        expect(decision.effectiveVibe).toBe("caring");
        expect(decision.blockedVibes).toContain("funny");
        expect(decision.blockedVibes).toContain("sarcastic");
      }
    });

    it("should detect distress from analyzed emotional context", () => {
      const input = createInput([
        {
          role: "other",
          content: "Today was difficult.",
        },
      ]);

      const context = createContext({
        emotionalTone: "The person sounds depressed and overwhelmed.",
      });

      const decision = policy.evaluate(input, context);

      expect(decision.action).toBe("allow");

      if (decision.action === "allow") {
        expect(decision.effectiveVibe).toBe("caring");
        expect(decision.signals).toContain(
          "emotional_distress",
        );
      }
    });
  });

  describe("ambiguous boundaries", () => {
    it("should block romantic escalation when the other person needs space", () => {
      const input = createInput(
        [
          {
            role: "other",
            content: "I need some space right now.",
          },
        ],
        {
          requestedVibe: "flirty",
          requestedGoal: "ask_out",
        },
      );

      const decision = policy.evaluate(
        input,
        createContext(),
      );

      expect(decision.action).toBe("allow");

      if (decision.action === "allow") {
        expect(decision.effectiveVibe).toBe("normal");
        expect(decision.effectiveGoal).toBe(
          "continue_conversation",
        );
        expect(decision.blockedVibes).toContain("flirty");
        expect(decision.blockedVibes).toContain("romantic");
        expect(decision.signals).toContain(
          "ambiguous_boundary",
        );
      }
    });

    it("should use conservative settings when engagement is uncertain", () => {
      const input = createInput(
        [
          {
            role: "other",
            content: "Maybe. I'm not sure.",
          },
        ],
        {
          requestedVibe: "romantic",
        },
      );

      const context = createContext({
        engagementLevel: "uncertain",
      });

      const decision = policy.evaluate(input, context);

      expect(decision.action).toBe("allow");

      if (decision.action === "allow") {
        expect(decision.effectiveVibe).toBe("normal");
        expect(decision.blockedVibes).toContain("flirty");
        expect(decision.blockedVibes).toContain("romantic");
        expect(decision.signals).toContain(
          "ambiguous_boundary",
        );
      }
    });
  });

  describe("normal conversations", () => {
    it("should preserve the requested vibe and goal when no safety signals exist", () => {
      const input = createInput(
        [
          {
            role: "self",
            content: "How was your day?",
          },
          {
            role: "other",
            content: "Pretty good. What about yours?",
          },
        ],
        {
          requestedVibe: "funny",
          requestedGoal: "make_them_laugh",
        },
      );

      const decision = policy.evaluate(
        input,
        createContext(),
      );

      expect(decision.action).toBe("allow");

      if (decision.action === "allow") {
        expect(decision.effectiveVibe).toBe("funny");
        expect(decision.effectiveGoal).toBe(
          "make_them_laugh",
        );
        expect(decision.blockedVibes).toHaveLength(0);
        expect(decision.constraints).toHaveLength(0);
        expect(decision.signals).toHaveLength(0);
      }
    });

    it("should not permanently block a conversation because of an older rejection", () => {
      const input = createInput(
        [
          {
            role: "other",
            content: "I only see you as a friend.",
          },
          {
            role: "self",
            content: "I understand. I respect that.",
          },
          {
            role: "other",
            content: "How was your weekend?",
          },
        ],
        {
          requestedVibe: "normal",
          requestedGoal: "continue_conversation",
        },
      );

      const decision = policy.evaluate(
        input,
        createContext(),
      );

      expect(decision.action).toBe("allow");

      if (decision.action === "allow") {
        expect(decision.effectiveVibe).toBe("normal");
        expect(decision.signals).not.toContain(
          "romantic_rejection",
        );
      }
    });
  });

  describe("conflicting safety signals", () => {
    it("should prioritize no-contact over every other decision", () => {
      const input = createInput(
        [
          {
            role: "other",
            content:
              "I'm feeling hopeless. Please don't contact me again.",
          },
        ],
        {
          requestedVibe: "romantic",
          requestedGoal: "ask_out",
        },
      );

      const context = createContext({
        emotionalTone: "The person sounds distressed.",
        engagementLevel: "uncertain",
      });

      const decision = policy.evaluate(input, context);

      expect(decision.action).toBe("no_action");
    });

    it("should prioritize emotional support when distress and romantic rejection coexist", () => {
      const input = createInput(
        [
          {
            role: "other",
            content:
              "I only see you as a friend. I've been feeling really depressed lately.",
          },
        ],
        {
          requestedVibe: "flirty",
          requestedGoal: "ask_out",
        },
      );

      const decision = policy.evaluate(
        input,
        createContext(),
      );

      expect(decision.action).toBe("allow");

      if (decision.action === "allow") {
        expect(decision.effectiveVibe).toBe("caring");
        expect(decision.effectiveGoal).toBe("show_empathy");

        expect(decision.signals).toContain(
          "romantic_rejection",
        );

        expect(decision.signals).toContain(
          "emotional_distress",
        );

        expect(decision.blockedVibes).toContain("flirty");
        expect(decision.blockedVibes).toContain("romantic");
        expect(decision.blockedVibes).toContain("funny");
        expect(decision.blockedVibes).toContain("sarcastic");
      }
    });
  });
});
