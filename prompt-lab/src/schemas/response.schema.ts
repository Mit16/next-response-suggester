
import { z } from "zod";

export const ConversationVibeSchema = z.enum([
  "normal",
  "funny",
  "playful",
  "flirty",
  "romantic",
  "sarcastic",
  "caring",
  "confident",
  "professional",
]);

export const EngagementLevelSchema = z.enum([
  "low",
  "moderate",
  "high",
  "uncertain",
]);

export const ConversationStageSchema = z.enum([
  "opening",
  "getting_to_know",
  "ongoing",
  "deepening",
  "closing",
  "uncertain",
]);

export const ConversationContextSchema = z.object({
  summary: z.string().min(1),
  emotionalTone: z.string().min(1),
  intent: z.string().min(1),
  engagementLevel: EngagementLevelSchema,
  topic: z.string().min(1),
  conversationStage: ConversationStageSchema,
  conversationDirection: z.string().min(1),
  boundarySignals: z.array(z.string()),
});

export const ResponseSuggestionSchema = z.object({
  text: z.string().min(1).max(500),
  vibe: ConversationVibeSchema,
  explanation: z.string().min(1).max(300),
});

export const SuggestionsOutputSchema = z.object({
  suggestions: z.array(ResponseSuggestionSchema).length(3),
});

export type ValidatedSuggestionsOutput = z.infer<
  typeof SuggestionsOutputSchema
>;

export const SuggestionResultSchema = z.object({
  context: ConversationContextSchema,
  suggestions: z.array(ResponseSuggestionSchema).length(3),
});

export type ValidatedSuggestionResult = z.infer<
  typeof SuggestionResultSchema
>;
