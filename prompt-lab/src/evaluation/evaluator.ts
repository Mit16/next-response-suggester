
// import type {
//   ConversationVibe,
//   ConversationScenario,
// } from "../types/conversation.types.js";

import {
  EvaluationDimensionSchema,
  SuggestionEvaluationSchema,
  ScenarioEvaluationSchema,
  type ValidatedSuggestionEvaluation,
  type ValidatedScenarioEvaluation,
} from "../schemas/evaluation.schema.js";

const DIMENSION_WEIGHTS = {
  contextual_accuracy: 25,
  relevance: 20,
  naturalness: 20,
  tone_consistency: 15,
  engagement: 10,
  boundary_awareness: 10,
} as const;

export type EvaluationDimension = keyof typeof DIMENSION_WEIGHTS;

export interface DimensionAssessment {
  dimension: EvaluationDimension;
  score: number;
  reasoning: string;
}

export interface SuggestionAssessment {
  scenarioId: string;
  suggestionIndex: number;
  scores: DimensionAssessment[];
  criticalBoundaryViolation: boolean;
  boundaryViolationReason?: string;
  overallFeedback: string;
}

export interface EvaluationThresholds {
  minimumWeightedScore: number;
  minimumDimensionScore: number;
}

const DEFAULT_THRESHOLDS: EvaluationThresholds = {
  minimumWeightedScore: 70,
  minimumDimensionScore: 2,
};


function validateAssessments(
  scores: DimensionAssessment[],
): void {
  const expectedDimensions = EvaluationDimensionSchema.options;

  // First, check for duplicate dimensions.
  const receivedDimensions = scores.map(
    (item) => item.dimension,
  );

  const receivedSet = new Set(receivedDimensions);

  if (receivedSet.size !== receivedDimensions.length) {
    throw new Error("Duplicate evaluation dimensions detected.");
  }

  // Then, check for missing dimensions.
  if (scores.length !== expectedDimensions.length) {
    throw new Error(
      `Expected ${expectedDimensions.length} dimension scores, received ${scores.length}.`,
    );
  }

  for (const dimension of expectedDimensions) {
    if (!receivedSet.has(dimension)) {
      throw new Error(`Missing evaluation dimension: ${dimension}`);
    }
  }

  // Finally, validate individual scores and reasoning.
  for (const item of scores) {
    if (
      !Number.isInteger(item.score) ||
      item.score < 1 ||
      item.score > 5
    ) {
      throw new Error(
        `Invalid score for ${item.dimension}: expected an integer from 1 to 5.`,
      );
    }

    if (!item.reasoning.trim()) {
      throw new Error(
        `Missing reasoning for ${item.dimension}.`,
      );
    }
  }
}

export function calculateWeightedScore(
  scores: DimensionAssessment[],
): number {
  validateAssessments(scores);

  const weightedTotal = scores.reduce((total, item) => {
    const weight = DIMENSION_WEIGHTS[item.dimension];

    return total + (item.score / 5) * weight;
  }, 0);

  return Number(weightedTotal.toFixed(2));
}

export function evaluateSuggestion(
  assessment: SuggestionAssessment,
  thresholds: EvaluationThresholds = DEFAULT_THRESHOLDS,
): ValidatedSuggestionEvaluation {
  validateAssessments(assessment.scores);

  const weightedScore = calculateWeightedScore(
    assessment.scores,
  );

  const hasLowDimensionScore = assessment.scores.some(
    (item) => item.score < thresholds.minimumDimensionScore,
  );

  const criticalBoundaryViolation =
    assessment.criticalBoundaryViolation;

  const boundaryViolationReason =
    criticalBoundaryViolation
      ? assessment.boundaryViolationReason?.trim() ||
        "Critical boundary violation detected."
      : "";

  const passed =
    weightedScore >= thresholds.minimumWeightedScore &&
    !hasLowDimensionScore &&
    !criticalBoundaryViolation;

  return SuggestionEvaluationSchema.parse({
    scenarioId: assessment.scenarioId,
    suggestionIndex: assessment.suggestionIndex,
    scores: assessment.scores.map((item) => ({
      ...item,
      weight: DIMENSION_WEIGHTS[item.dimension],
    })),
    weightedScore,
    criticalBoundaryViolation,
    boundaryViolationReason,
    passed,
    overallFeedback: assessment.overallFeedback,
  });
}

export function evaluateScenario(
  scenarioId: string,
  assessments: SuggestionAssessment[],
  thresholds: EvaluationThresholds = DEFAULT_THRESHOLDS,
): ValidatedScenarioEvaluation {
  if (assessments.length !== 3) {
    throw new Error(
      `Expected 3 suggestion assessments, received ${assessments.length}.`,
    );
  }

  const suggestionIndices = assessments.map(
    (assessment) => assessment.suggestionIndex,
  );

  if (
    new Set(suggestionIndices).size !== 3 ||
    ![0, 1, 2].every((index) =>
      suggestionIndices.includes(index),
    )
  ) {
    throw new Error(
      "Suggestion indices must be unique and contain 0, 1, and 2.",
    );
  }

  if (assessments.some((item) => item.scenarioId !== scenarioId)) {
    throw new Error(
      "All assessments must belong to the same scenario.",
    );
  }

  const evaluations = assessments
    .map((assessment) =>
      evaluateSuggestion(assessment, thresholds),
    )
    .sort((a, b) => a.suggestionIndex - b.suggestionIndex);

  const bestSuggestion = evaluations.reduce((best, current) =>
    current.weightedScore > best.weightedScore ? current : best,
  );

  const averageScore =
    evaluations.reduce(
      (total, evaluation) => total + evaluation.weightedScore,
      0,
    ) / evaluations.length;

  const passed = evaluations.every(
    (evaluation) => evaluation.passed,
  );

  return ScenarioEvaluationSchema.parse({
    scenarioId,
    evaluations,
    bestSuggestionIndex: bestSuggestion.suggestionIndex,
    averageScore: Number(averageScore.toFixed(2)),
    passed,
  });
}
