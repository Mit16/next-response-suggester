
import { describe, expect, it, vi } from "vitest";

import {
  AIResponseParseError,
  ConversationAnalyzer,
} from "./conversation.analyzer.js";

import type {
  AICompletionOptions,
  AICompletionResult,
  AIProvider,
} from "../providers/provider.interface.js";

import type { ConversationInput } from "../types/conversation.types.js";

const conversationInput: ConversationInput = {
  messages: [
    {
      role: "self",
      content: "Hey, how was your day?",
    },
    {
      role: "other",
      content: "Pretty exhausting, honestly.",
    },
  ],
};

const validContext = {
  summary: "The other person had an exhausting day.",
  emotionalTone: "Tired and slightly drained.",
  intent: "Sharing how their day went.",
  engagementLevel: "moderate",
  topic: "Daily experiences and tiredness.",
  conversationStage: "ongoing",
  conversationDirection: "The conversation could move toward empathetic support.",
  boundarySignals: [],
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
      completionTokens: 50,
      totalTokens: 150,
    },
  };
}

function createProvider(
  content: string,
) {
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

describe("ConversationAnalyzer", () => {
  it("should analyze a conversation and return validated context", async () => {
    const { provider } = createProvider(
      JSON.stringify(validContext),
    );

    const analyzer = new ConversationAnalyzer(provider, {
      model: "test-model",
    });

    const result = await analyzer.analyze(conversationInput);

    expect(result).toEqual(validContext);
  });

  it("should send JSON response format to the provider", async () => {
    const { provider, generate } = createProvider(
      JSON.stringify(validContext),
    );

    const analyzer = new ConversationAnalyzer(provider, {
      model: "test-model",
    });

    await analyzer.analyze(conversationInput);

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        responseFormat: "json",
      }),
    );
  });

  it("should use the configured temperature and token limit", async () => {
    const { provider, generate } = createProvider(
      JSON.stringify(validContext),
    );

    const analyzer = new ConversationAnalyzer(provider, {
      model: "test-model",
      temperature: 0.2,
      maxTokens: 1000,
    });

    await analyzer.analyze(conversationInput);

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.2,
        maxTokens: 1000,
      }),
    );
  });

  it("should use default temperature and token limit", async () => {
    const { provider, generate } = createProvider(
      JSON.stringify(validContext),
    );

    const analyzer = new ConversationAnalyzer(provider, {
      model: "test-model",
    });

    await analyzer.analyze(conversationInput);

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0.1,
        maxTokens: 800,
      }),
    );
  });

  it("should throw AIResponseParseError for invalid JSON", async () => {
    const { provider } = createProvider(
      "This is not valid JSON",
    );

    const analyzer = new ConversationAnalyzer(provider, {
      model: "test-model",
    });

    await expect(
      analyzer.analyze(conversationInput),
    ).rejects.toBeInstanceOf(AIResponseParseError);
  });

  it("should throw AIResponseParseError for invalid context structure", async () => {
    const invalidContext = {
      ...validContext,
      engagementLevel: "extremely_high",
    };

    const { provider } = createProvider(
      JSON.stringify(invalidContext),
    );

    const analyzer = new ConversationAnalyzer(provider, {
      model: "test-model",
    });

    await expect(
      analyzer.analyze(conversationInput),
    ).rejects.toThrow(
      "invalid structure",
    );
  });

  it("should propagate provider errors unchanged", async () => {
    const providerError = new Error("Provider unavailable");

    const provider: AIProvider = {
      name: "mock",
      generate: vi.fn().mockRejectedValue(providerError),
    };

    const analyzer = new ConversationAnalyzer(provider, {
      model: "test-model",
    });

    await expect(
      analyzer.analyze(conversationInput),
    ).rejects.toBe(providerError);
  });

  it("should pass the generated analyzer messages to the provider", async () => {
    const { provider, generate } = createProvider(
      JSON.stringify(validContext),
    );

    const analyzer = new ConversationAnalyzer(provider, {
      model: "test-model",
    });

    await analyzer.analyze(conversationInput);

    const options = generate.mock.calls[0]?.[0];

    expect(options?.messages).toHaveLength(2);
    expect(options?.messages[0]?.role).toBe("system");
    expect(options?.messages[1]?.role).toBe("user");
    expect(options?.messages[1]?.content).toContain(
      "Hey, how was your day?",
    );
  });
});
