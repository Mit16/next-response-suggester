
import { describe, expect, it, vi } from "vitest";

import {
  AIResponseParseError,
} from "./conversation.analyzer.js";

import {
  ResponseGenerator,
} from "./response.generator.js";

import type {
  AICompletionOptions,
  AICompletionResult,
  AIProvider,
} from "../providers/provider.interface.js";

import type {
  ConversationContext,
  ConversationInput,
} from "../types/conversation.types.js";

const conversationInput: ConversationInput = {
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

const conversationContext: ConversationContext = {
  summary: "The other person had an exhausting day.",
  emotionalTone: "Tired and slightly drained.",
  intent: "Sharing how their day went.",
  engagementLevel: "moderate",
  topic: "Daily experiences and tiredness.",
  conversationStage: "ongoing",
  conversationDirection: "The conversation could move toward empathetic support.",
  boundarySignals: [],
};

const validSuggestions = {
  suggestions: [
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
  ],
};

function createCompletion(
  content: string,
): AICompletionResult {
  return {
    content,
    model: "test-model",
    finishReason: "stop",
    usage: {
      promptTokens: 100,
      completionTokens: 100,
      totalTokens: 200,
    },
  };
}

function createProvider(content: string) {
  const generate = vi.fn(
    async (
      _options: AICompletionOptions,
    ): Promise<AICompletionResult> => createCompletion(content),
  );

  const provider: AIProvider = {
    name: "mock",
    generate,
  };

  return { provider, generate };
}

describe("ResponseGenerator", () => {
  it("should generate exactly three validated suggestions", async () => {
    const { provider } = createProvider(
      JSON.stringify(validSuggestions),
    );

    const generator = new ResponseGenerator(provider, {
      model: "test-model",
    });

    const result = await generator.generate(
      conversationInput,
      conversationContext,
    );

    expect(result).toEqual(validSuggestions.suggestions);
    expect(result).toHaveLength(3);
  });

  it("should send JSON response format to the provider", async () => {
    const { provider, generate } = createProvider(
      JSON.stringify(validSuggestions),
    );

    const generator = new ResponseGenerator(provider, {
      model: "test-model",
    });

    await generator.generate(
      conversationInput,
      conversationContext,
    );

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        responseFormat: "json",
      }),
    );
  });

  it("should use configured temperature and token limit", async () => {
    const { provider, generate } = createProvider(
      JSON.stringify(validSuggestions),
    );

    const generator = new ResponseGenerator(provider, {
      model: "test-model",
      temperature: 0.5,
      maxTokens: 1500,
    });

    await generator.generate(
      conversationInput,
      conversationContext,
    );

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.5,
        maxTokens: 1500,
      }),
    );
  });

  it("should use default temperature and token limit", async () => {
    const { provider, generate } = createProvider(
      JSON.stringify(validSuggestions),
    );

    const generator = new ResponseGenerator(provider, {
      model: "test-model",
    });

    await generator.generate(
      conversationInput,
      conversationContext,
    );

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.7,
        maxTokens: 1200,
      }),
    );
  });

  it("should throw AIResponseParseError for invalid JSON", async () => {
    const { provider } = createProvider(
      "Invalid JSON response",
    );

    const generator = new ResponseGenerator(provider, {
      model: "test-model",
    });

    await expect(
      generator.generate(conversationInput, conversationContext),
    ).rejects.toBeInstanceOf(AIResponseParseError);
  });

  it("should reject responses containing fewer than three suggestions", async () => {
    const invalidOutput = {
      suggestions: validSuggestions.suggestions.slice(0, 2),
    };

    const { provider } = createProvider(
      JSON.stringify(invalidOutput),
    );

    const generator = new ResponseGenerator(provider, {
      model: "test-model",
    });

    await expect(
      generator.generate(conversationInput, conversationContext),
    ).rejects.toThrow("invalid structure");
  });

  it("should reject suggestions with invalid fields", async () => {
    const invalidOutput = {
      suggestions: [
        ...validSuggestions.suggestions.slice(0, 2),
        {
          text: "",
          vibe: "unknown",
          explanation: "",
        },
      ],
    };

    const { provider } = createProvider(
      JSON.stringify(invalidOutput),
    );

    const generator = new ResponseGenerator(provider, {
      model: "test-model",
    });

    await expect(
      generator.generate(conversationInput, conversationContext),
    ).rejects.toBeInstanceOf(AIResponseParseError);
  });

  it("should propagate provider errors unchanged", async () => {
    const providerError = new Error("Provider unavailable");

    const provider: AIProvider = {
      name: "mock",
      generate: vi.fn().mockRejectedValue(providerError),
    };

    const generator = new ResponseGenerator(provider, {
      model: "test-model",
    });

    await expect(
      generator.generate(conversationInput, conversationContext),
    ).rejects.toBe(providerError);
  });

  it("should pass conversation and analyzed context to the provider", async () => {
    const { provider, generate } = createProvider(
      JSON.stringify(validSuggestions),
    );

    const generator = new ResponseGenerator(provider, {
      model: "test-model",
    });

    await generator.generate(
      conversationInput,
      conversationContext,
    );

    const options = generate.mock.calls[0]?.[0];

    expect(options?.messages).toHaveLength(2);

    const payload = JSON.parse(
      options?.messages[1]?.content ?? "{}",
    );

    expect(payload.conversation).toEqual(
      conversationInput.messages,
    );

    expect(payload.analyzedContext).toEqual(
      conversationContext,
    );

    expect(payload.requestedVibe).toBe("caring");
    expect(payload.requestedGoal).toBe("continue_conversation");
  });
});
