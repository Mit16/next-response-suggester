
import { describe, expect, it, vi } from "vitest";

import {
  InferenceOrchestrator,
  SuggestionSafetyError,
} from "./inference.orchestrator.js";

import type {
  ConversationAnalyzer,
} from "./conversation.analyzer.js";

import type {
  ResponseGenerator,
} from "./response.generator.js";

import type {
  ConversationContext,
  ConversationInput,
  ResponseSuggestion,
} from "../types/conversation.types.js";

const input: ConversationInput = {
  messages: [
    {
      role: "self",
      content: "How was your day?",
    },
    {
      role: "other",
      content: "Pretty exhausting honestly.",
    },
  ],
  requestedVibe: "caring",
  requestedGoal: "continue_conversation",
};

const context: ConversationContext = {
  summary: "The other person had an exhausting day.",
  emotionalTone: "Tired and slightly drained.",
  intent: "Sharing how their day went.",
  engagementLevel: "moderate",
  topic: "Daily experiences and tiredness.",
  conversationStage: "ongoing",
  conversationDirection:
    "The conversation could move toward empathetic support.",
  boundarySignals: [],
};

const suggestions: ResponseSuggestion[] = [
  {
    text: "Sounds like a long day. Everything okay?",
    vibe: "caring",
    explanation: "Acknowledges their exhaustion.",
  },
  {
    text: "That's rough. Hope you get some time to relax tonight.",
    vibe: "caring",
    explanation: "Offers support without demanding a response.",
  },
  {
    text: "Long day? You deserve a proper break.",
    vibe: "caring",
    explanation: "Keeps the response warm and conversational.",
  },
];

function createEngines() {
  const analyze = vi.fn().mockResolvedValue(context);
  const generate = vi.fn().mockResolvedValue(suggestions);

  const analyzer = {
    analyze,
  } as unknown as ConversationAnalyzer;

  const generator = {
    generate,
  } as unknown as ResponseGenerator;

  return {
    analyzer,
    generator,
    analyze,
    generate,
  };
}

describe("InferenceOrchestrator", () => {
  it("should execute analysis and generation successfully", async () => {
    const { analyzer, generator } = createEngines();

    const orchestrator = new InferenceOrchestrator(
      analyzer,
      generator,
    );

    const result = await orchestrator.execute(input);

    expect(result.status).toBe("suggestions");

    expect(result).toEqual({
      status: "suggestions",
      context,
      suggestions,
    });
  });

  it("should analyze the original conversation input", async () => {
    const {
      analyzer,
      generator,
      analyze,
    } = createEngines();

    const orchestrator = new InferenceOrchestrator(
      analyzer,
      generator,
    );

    await orchestrator.execute(input);

    expect(analyze).toHaveBeenCalledOnce();
    expect(analyze).toHaveBeenCalledWith(input);
  });

  it("should pass analyzed context to the generator", async () => {
    const {
      analyzer,
      generator,
      generate,
    } = createEngines();

    const orchestrator = new InferenceOrchestrator(
      analyzer,
      generator,
    );

    await orchestrator.execute(input);

    expect(generate).toHaveBeenCalledOnce();
    expect(generate).toHaveBeenCalledWith(
      input,
      context,
      {
        blockedVibes: [],
        constraints: [],
        signals: [],
      },
      undefined,
    );
  });

  it("should execute analysis before generation", async () => {
    const {
      analyzer,
      generator,
      analyze,
      generate,
    } = createEngines();

    const executionOrder: string[] = [];

    analyze.mockImplementation(async () => {
      executionOrder.push("analyze");
      return context;
    });

    generate.mockImplementation(async () => {
      executionOrder.push("generate");
      return suggestions;
    });

    const orchestrator = new InferenceOrchestrator(
      analyzer,
      generator,
    );

    await orchestrator.execute(input);

    expect(executionOrder).toEqual([
      "analyze",
      "generate",
    ]);
  });

  it("should not call generator if analysis fails", async () => {
    const {
      analyzer,
      generator,
      analyze,
      generate,
    } = createEngines();

    const error = new Error("Analysis failed");

    analyze.mockRejectedValue(error);

    const orchestrator = new InferenceOrchestrator(
      analyzer,
      generator,
    );

    await expect(
      orchestrator.execute(input),
    ).rejects.toBe(error);

    expect(generate).not.toHaveBeenCalled();
  });

  it("should propagate generator errors unchanged", async () => {
    const {
      analyzer,
      generator,
      generate,
    } = createEngines();

    const error = new Error("Generation failed");

    generate.mockRejectedValue(error);

    const orchestrator = new InferenceOrchestrator(
      analyzer,
      generator,
    );

    await expect(
      orchestrator.execute(input),
    ).rejects.toBe(error);
  });

  it("should return no_action without calling the generator when safety blocks the conversation", async () => {
    const {
      analyzer,
      generator,
      generate,
    } = createEngines();

    const orchestrator = new InferenceOrchestrator(
      analyzer,
      generator,
    );

    const blockedInput: ConversationInput = {
      messages: [
        {
          role: "other",
          content: "Please don't message me again.",
        },
      ],
    };

    const result = await orchestrator.execute(blockedInput);

    expect(result.status).toBe("no_action");
    expect(generate).not.toHaveBeenCalled();

    if (result.status === "no_action") {
      expect(result.reason).toBeTruthy();
    }
  });

  it("should apply the effective vibe and goal before generation", async () => {
    const {
      analyzer,
      generator,
      generate,
    } = createEngines();

    const orchestrator = new InferenceOrchestrator(
      analyzer,
      generator,
    );

    const inputWithRomanticRejection: ConversationInput = {
      messages: [
        {
          role: "other",
          content: "I only see you as a friend.",
        },
      ],
      requestedVibe: "flirty",
      requestedGoal: "ask_out",
    };

    await orchestrator.execute(inputWithRomanticRejection);

    expect(generate).toHaveBeenCalledOnce();

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedVibe: "normal",
        requestedGoal: "continue_conversation",
      }),
      context,
      expect.objectContaining({
        blockedVibes: expect.arrayContaining([
          "flirty",
          "romantic",
        ]),
        constraints: expect.arrayContaining([
          "Do not pursue romantic or flirtatious interaction.",
          "Respect the rejection without trying to change the other person's mind.",
        ]),
        signals: expect.arrayContaining([
          "romantic_rejection",
        ]),
      }),
      undefined,
    );
  });

  it("should preserve the original input object when applying safety overrides", async () => {
    const {
      analyzer,
      generator,
    } = createEngines();

    const orchestrator = new InferenceOrchestrator(
      analyzer,
      generator,
    );

    const originalInput: ConversationInput = {
      messages: [
        {
          role: "other",
          content: "I only see you as a friend.",
        },
      ],
      requestedVibe: "flirty",
      requestedGoal: "ask_out",
    };

    await orchestrator.execute(originalInput);

    expect(originalInput.requestedVibe).toBe("flirty");
    expect(originalInput.requestedGoal).toBe("ask_out");
  });


  it("should pass safety metadata to the generator", async () => {
    const { analyzer, generator, generate } = createEngines();

    const orchestrator = new InferenceOrchestrator(
      analyzer,
      generator,
    );

    const rejectionInput: ConversationInput = {
      messages: [
        {
          role: "self",
          content: "Would you like to go out sometime?",
        },
        {
          role: "other",
          content: "I only see you as a friend.",
        },
      ],
      requestedVibe: "flirty",
      requestedGoal: "ask_out",
    };

    await orchestrator.execute(rejectionInput);

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedVibe: "normal",
        requestedGoal: "continue_conversation",
      }),
      context,
      expect.objectContaining({
        blockedVibes: expect.arrayContaining([
          "flirty",
          "romantic",
        ]),
        signals: expect.arrayContaining([
          "romantic_rejection",
        ]),
        constraints: expect.any(Array),
      }),
      undefined,
    );
  });


  it("should reject invalid combined results", async () => {
    const {
      analyzer,
    } = createEngines();

    const invalidSuggestions = suggestions.slice(0, 2);

    const invalidGenerator = {
      generate: vi.fn().mockResolvedValue(invalidSuggestions),
    } as unknown as ResponseGenerator;

    const orchestrator = new InferenceOrchestrator(
      analyzer,
      invalidGenerator,
    );

    await expect(
      orchestrator.execute(input),
    ).rejects.toThrow(
      "invalid suggestion result",
    );
  });

  it("should regenerate unsafe suggestions and return the next valid set", async () => {
    const {
      analyzer,
      generator,
      generate,
    } = createEngines();

    const unsafeSuggestions: ResponseSuggestion[] = [
      {
        text: "I know you said no, but give us a chance.",
        vibe: "flirty",
        explanation: "Unsafe romantic pursuit.",
      },
      ...suggestions.slice(1),
    ];

    generate
      .mockResolvedValueOnce(unsafeSuggestions)
      .mockResolvedValueOnce(suggestions);

    const orchestrator = new InferenceOrchestrator(
      analyzer,
      generator,
    );

    const rejectionInput: ConversationInput = {
      messages: [
        {
          role: "self",
          content: "Would you like to go out sometime?",
        },
        {
          role: "other",
          content: "I only see you as a friend.",
        },
      ],
      requestedVibe: "flirty",
      requestedGoal: "ask_out",
    };

    const result = await orchestrator.execute(rejectionInput);

    expect(result.status).toBe("suggestions");

    if (result.status === "suggestions") {
      expect(result.suggestions).toEqual(suggestions);
    }

    expect(generate).toHaveBeenCalledTimes(2);

    expect(generate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        requestedVibe: "normal",
        requestedGoal: "continue_conversation",
      }),
      context,
      expect.objectContaining({
        signals: expect.arrayContaining([
          "romantic_rejection",
        ]),
      }),
      {
        attempt: 1,
        violations: expect.arrayContaining([
          "blocked_vibe",
          "romantic_pursuit",
        ]),
      },
    );
  });

  it("should throw SuggestionSafetyError when all generation attempts fail validation", async () => {
    const {
      analyzer,
      generator,
      generate,
    } = createEngines();

    const unsafeSuggestions: ResponseSuggestion[] = [
      {
        text: "I know you said no, but give us a chance.",
        vibe: "flirty",
        explanation: "Unsafe romantic pursuit.",
      },
      ...suggestions.slice(1),
    ];

    generate.mockResolvedValue(unsafeSuggestions);

    const orchestrator = new InferenceOrchestrator(
      analyzer,
      generator,
    );

    const rejectionInput: ConversationInput = {
      messages: [
        {
          role: "other",
          content: "I only see you as a friend.",
        },
      ],
      requestedVibe: "flirty",
      requestedGoal: "ask_out",
    };

    await expect(
      orchestrator.execute(rejectionInput),
    ).rejects.toMatchObject({
      name: "SuggestionSafetyError",
      attempts: 3,
      violations: expect.arrayContaining([
        "blocked_vibe",
        "romantic_pursuit",
      ]),
    });

    // One initial generation + two retries.
    expect(generate).toHaveBeenCalledTimes(3);

    expect(generate).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      context,
      expect.any(Object),
      {
        attempt: 1,
        violations: expect.arrayContaining([
          "blocked_vibe",
          "romantic_pursuit",
        ]),
      },
    );

    expect(generate).toHaveBeenNthCalledWith(
      3,
      expect.any(Object),
      context,
      expect.any(Object),
      {
        attempt: 2,
        violations: expect.arrayContaining([
          "blocked_vibe",
          "romantic_pursuit",
        ]),
      },
    );
  });
});
