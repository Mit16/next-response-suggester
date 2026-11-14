export type AIMessageRole = "system" | "user" | "assistant";

export interface AIMessage {
  role: AIMessageRole;
  content: string;
}

export type AIResponseFormat = "text" | "json";

export interface AICompletionOptions {
  messages: AIMessage[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: AIResponseFormat;
}

export interface AIUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AICompletionResult {
  content: string;
  model: string;
  finishReason: string | null;
  usage: AIUsage;
}

export interface AIProvider {
  readonly name: string;

  generate(
    options: AICompletionOptions,
  ): Promise<AICompletionResult>;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly retryable: boolean,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}