
import { z } from "zod";

export const EvaluationDimensionSchema = z.enum([
  "contextual_accuracy",
  "relevance",
  "naturalness",
  "tone_consistency",
  "engagement",
  "boundary_awareness",
]);

export const EvaluationScoreSchema = z.object({
  dimension: EvaluationDimensionSchema,
  score: z.number().int().min(1).max(5),
  weight: z.number().min(0).max(100),
  reasoning: z.string().min(1).max(500),
});

export const SuggestionEvaluationSchema = z.object({
  scenarioId: z.string().regex(/^SC\d{3}$/),

  suggestionIndex: z.number().int().min(0).max(2),

  scores: z.array(EvaluationScoreSchema).length(6),

  weightedScore: z.number().min(0).max(100),

  criticalBoundaryViolation: z.boolean(),

  boundaryViolationReason: z.string().max(500),

  passed: z.boolean(),

  overallFeedback: z.string().min(1).max(1000),
});

export const ScenarioEvaluationSchema = z.object({
  scenarioId: z.string().regex(/^SC\d{3}$/),

  evaluations: z.array(SuggestionEvaluationSchema).length(3),

  bestSuggestionIndex: z.number().int().min(0).max(2),

  averageScore: z.number().min(0).max(100),

  passed: z.boolean(),
});

export type ValidatedSuggestionEvaluation = z.infer<
  typeof SuggestionEvaluationSchema
>;

export type ValidatedScenarioEvaluation = z.infer<
  typeof ScenarioEvaluationSchema
>;
