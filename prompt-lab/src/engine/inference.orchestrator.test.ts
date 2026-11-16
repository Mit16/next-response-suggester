
import { describe, expect, it, vi } from "vitest";

import {
  InferenceOrchestrator,
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
  conversationDirection: "The conversation could move toward empathetic support.",
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
    const {
      analyzer,
      generator,
    } = createEngines();

    const orchestrator = new InferenceOrchestrator(
      analyzer,
      generator,
    );

    const result = await orchestrator.execute(input);

    expect(result).toEqual({
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
    expect(generate).toHaveBeenCalledWith(input, context);
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

  it("should reject invalid combined results", async () => {
    const {
      analyzer,
      generator,
    } = createEngines();

    const invalidSuggestions = [
      ...suggestions.slice(0, 2),
    ];

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
});
