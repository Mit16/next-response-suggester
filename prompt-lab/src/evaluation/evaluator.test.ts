
import { describe, expect, it } from "vitest";

import {
  calculateWeightedScore,
  evaluateSuggestion,
  evaluateScenario,
  type DimensionAssessment,
  type SuggestionAssessment,
} from "./evaluator.js";

const validScores: DimensionAssessment[] = [
  {
    dimension: "contextual_accuracy",
    score: 4,
    reasoning: "Understands the conversation.",
  },
  {
    dimension: "relevance",
    score: 5,
    reasoning: "Directly addresses the latest message.",
  },
  {
    dimension: "naturalness",
    score: 4,
    reasoning: "Sounds natural.",
  },
  {
    dimension: "tone_consistency",
    score: 4,
    reasoning: "Matches the requested tone.",
  },
  {
    dimension: "engagement",
    score: 3,
    reasoning: "Keeps the conversation moving.",
  },
  {
    dimension: "boundary_awareness",
    score: 5,
    reasoning: "Respects personal boundaries.",
  },
];

function createAssessment(
  index: number,
  overrides: Partial<SuggestionAssessment> = {},
): SuggestionAssessment {
  return {
    scenarioId: "SC001",
    suggestionIndex: index,
    scores: validScores,
    criticalBoundaryViolation: false,
    overallFeedback: "A suitable conversational response.",
    ...overrides,
  };
}

describe("Evaluation Engine", () => {
  describe("calculateWeightedScore", () => {
    it("calculates the weighted score correctly", () => {
      expect(calculateWeightedScore(validScores)).toBe(84);
    });

    it("rejects missing dimensions", () => {
      expect(() =>
        calculateWeightedScore(validScores.slice(0, 5)),
      ).toThrow(/Expected 6 dimension scores/);
    });

    it("rejects duplicate dimensions", () => {
      const duplicateScores = [
        ...validScores.slice(0, 5),
        {
          ...validScores[0],
        },
      ];

      expect(() =>
        calculateWeightedScore(duplicateScores),
      ).toThrow(/Duplicate evaluation dimensions/);
    });

    it("rejects scores outside the 1-5 range", () => {
      const invalidScores = validScores.map((item) =>
        item.dimension === "relevance"
          ? { ...item, score: 6 }
          : item,
      );

      expect(() =>
        calculateWeightedScore(invalidScores),
      ).toThrow(/Invalid score/);
    });
  });

  describe("evaluateSuggestion", () => {
    it("passes a suggestion with a sufficient score", () => {
      const result = evaluateSuggestion(
        createAssessment(0),
      );

      expect(result.weightedScore).toBe(84);
      expect(result.passed).toBe(true);
      expect(result.criticalBoundaryViolation).toBe(false);
    });

    it("fails a suggestion with a critical boundary violation", () => {
      const result = evaluateSuggestion(
        createAssessment(0, {
          criticalBoundaryViolation: true,
          boundaryViolationReason:
            "The response ignores an explicit request to stop messaging.",
        }),
      );

      expect(result.weightedScore).toBe(84);
      expect(result.criticalBoundaryViolation).toBe(true);
      expect(result.passed).toBe(false);
    });

    it("fails when an individual dimension is too low", () => {
      const lowScores = validScores.map((item) =>
        item.dimension === "naturalness"
          ? { ...item, score: 1 }
          : item,
      );

      const result = evaluateSuggestion(
        createAssessment(0, { scores: lowScores }),
      );

      expect(result.passed).toBe(false);
    });
  });

  describe("evaluateScenario", () => {
    it("evaluates all three suggestions", () => {
      const assessments = [
        createAssessment(0),
        createAssessment(1),
        createAssessment(2),
      ];

      const result = evaluateScenario("SC001", assessments);

      expect(result.evaluations).toHaveLength(3);
      expect(result.averageScore).toBe(84);
      expect(result.passed).toBe(true);
    });

    it("selects the suggestion with the highest score", () => {
      const lowScores = validScores.map((item) => ({
        ...item,
        score: 3,
      }));

      const highScores = validScores.map((item) => ({
        ...item,
        score: 5,
      }));

      const result = evaluateScenario("SC001", [
        createAssessment(0, { scores: lowScores }),
        createAssessment(1, { scores: highScores }),
        createAssessment(2),
      ]);

      expect(result.bestSuggestionIndex).toBe(1);
    });

    it("rejects an incorrect number of suggestions", () => {
      expect(() =>
        evaluateScenario("SC001", [
          createAssessment(0),
          createAssessment(1),
        ]),
      ).toThrow(/Expected 3 suggestion assessments/);
    });

    it("rejects duplicate suggestion indices", () => {
      expect(() =>
        evaluateScenario("SC001", [
          createAssessment(0),
          createAssessment(0),
          createAssessment(2),
        ]),
      ).toThrow(/Suggestion indices must be unique/);
    });

    it("rejects assessments belonging to another scenario", () => {
      expect(() =>
        evaluateScenario("SC001", [
          createAssessment(0),
          createAssessment(1, { scenarioId: "SC002" }),
          createAssessment(2),
        ]),
      ).toThrow(/same scenario/);
    });
  });
});
