
import { describe, expect, it, vi } from "vitest";

import {
  BudgetedAIProvider,
  BudgetExceededError,
} from "./budgeted.provider.js";

import type {
  AIProvider,
  AICompletionOptions,
  AICompletionResult,
} from "./provider.interface.js";

const options: AICompletionOptions = {
  model: "test-model",
  messages: [{ role: "user", content: "Test" }],
  maxTokens: 1000,
};

function createResult(
  totalTokens = 100,
): AICompletionResult {
  return {
    content: "Test response",
    model: "test-model",
    finishReason: "stop",
    usage: {
      promptTokens: 40,
      completionTokens: totalTokens - 40,
      totalTokens,
    },
  };
}

function createProvider(
  result = createResult(),
) {
  const generate = vi.fn().mockResolvedValue(result);

  const provider = {
    name: "mock",
    generate,
  } as unknown as AIProvider;

  return { provider, generate };
}

describe("BudgetedAIProvider", () => {
  it("should cap output tokens per request", async () => {
    const { provider, generate } = createProvider();

    const budgeted = new BudgetedAIProvider(provider, {
      maxRequests: 5,
      maxTotalTokens: 1000,
      maxOutputTokensPerRequest: 500,
    });

    await budgeted.generate(options);

    expect(generate).toHaveBeenCalledWith({
      ...options,
      maxTokens: 500,
    });
  });

  it("should track actual token usage", async () => {
    const { provider } = createProvider(createResult(120));

    const budgeted = new BudgetedAIProvider(provider, {
      maxRequests: 5,
      maxTotalTokens: 1000,
      maxOutputTokensPerRequest: 500,
    });

    await budgeted.generate(options);

    expect(budgeted.getUsage()).toEqual({
      requests: 1,
      successfulRequests: 1,
      promptTokens: 40,
      completionTokens: 80,
      totalTokens: 120,
      budgetExhausted: false,
    });
  });

  it("should block requests after reaching the request limit", async () => {
    const { provider, generate } = createProvider();

    const budgeted = new BudgetedAIProvider(provider, {
      maxRequests: 1,
      maxTotalTokens: 1000,
      maxOutputTokensPerRequest: 500,
    });

    await budgeted.generate(options);

    await expect(
      budgeted.generate(options),
    ).rejects.toBeInstanceOf(BudgetExceededError);

    expect(generate).toHaveBeenCalledOnce();
  });

  it("should block requests after reaching the token limit", async () => {
    const { provider, generate } = createProvider(createResult(100));

    const budgeted = new BudgetedAIProvider(provider, {
      maxRequests: 5,
      maxTotalTokens: 100,
      maxOutputTokensPerRequest: 500,
    });

    await budgeted.generate(options);

    await expect(
      budgeted.generate(options),
    ).rejects.toBeInstanceOf(BudgetExceededError);

    expect(generate).toHaveBeenCalledOnce();
  });

  it("should count failed attempts against the request limit", async () => {
    const generate = vi.fn().mockRejectedValue(
      new Error("Provider unavailable"),
    );

    const provider = {
      name: "mock",
      generate,
    } as unknown as AIProvider;

    const budgeted = new BudgetedAIProvider(provider, {
      maxRequests: 1,
      maxTotalTokens: 1000,
      maxOutputTokensPerRequest: 500,
    });

    await expect(
      budgeted.generate(options),
    ).rejects.toThrow("Provider unavailable");

    await expect(
      budgeted.generate(options),
    ).rejects.toBeInstanceOf(BudgetExceededError);

    expect(budgeted.getUsage().requests).toBe(1);
    expect(budgeted.getUsage().successfulRequests).toBe(0);
  });
});
