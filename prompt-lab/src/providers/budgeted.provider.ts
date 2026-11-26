
import type {
  AICompletionOptions,
  AICompletionResult,
  AIProvider,
} from "./provider.interface.js";

export interface ProviderBudget {
  maxRequests: number;
  maxTotalTokens: number;
  maxOutputTokensPerRequest: number;
}

export interface ProviderUsageSummary {
  requests: number;
  successfulRequests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  budgetExhausted: boolean;
}

export class BudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BudgetExceededError";
  }
}

export class BudgetedAIProvider implements AIProvider {
  readonly name: string;

  private requests = 0;
  private successfulRequests = 0;
  private promptTokens = 0;
  private completionTokens = 0;
  private totalTokens = 0;
  private budgetExhausted = false;

  constructor(
    private readonly provider: AIProvider,
    private readonly budget: ProviderBudget,
  ) {
    this.name = `budgeted-${provider.name}`;

    if (
      budget.maxRequests < 1 ||
      budget.maxTotalTokens < 1 ||
      budget.maxOutputTokensPerRequest < 1
    ) {
      throw new Error("Provider budget limits must be positive.");
    }
  }

  async generate(
    options: AICompletionOptions,
  ): Promise<AICompletionResult> {
    if (this.budgetExhausted) {
      throw new BudgetExceededError(
        "The benchmark token budget has been exhausted.",
      );
    }

    if (this.requests >= this.budget.maxRequests) {
      this.budgetExhausted = true;

      throw new BudgetExceededError(
        "Maximum API request count reached.",
      );
    }

    if (this.totalTokens >= this.budget.maxTotalTokens) {
      this.budgetExhausted = true;

      throw new BudgetExceededError(
        "Maximum total token budget reached.",
      );
    }

    // Count attempted requests, including failed requests.
    this.requests++;

    const maxTokens = Math.min(
      options.maxTokens ?? this.budget.maxOutputTokensPerRequest,
      this.budget.maxOutputTokensPerRequest,
    );

    const result = await this.provider.generate({
      ...options,
      maxTokens,
    });

    this.successfulRequests++;
    this.promptTokens += result.usage.promptTokens;
    this.completionTokens += result.usage.completionTokens;
    this.totalTokens += result.usage.totalTokens;

    // Block subsequent requests if the actual usage reaches the budget.
    if (this.totalTokens >= this.budget.maxTotalTokens) {
      this.budgetExhausted = true;
    }

    return result;
  }

  getUsage(): ProviderUsageSummary {
    return {
      requests: this.requests,
      successfulRequests: this.successfulRequests,
      promptTokens: this.promptTokens,
      completionTokens: this.completionTokens,
      totalTokens: this.totalTokens,
      budgetExhausted: this.budgetExhausted,
    };
  }
}
