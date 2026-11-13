
import { describe, expect, it } from "vitest";

import {
  generateEvaluationReport,
  generateMarkdownReport,
} from "./report.generator.js";

import type { ScenarioReportInput } from "./report.types.js";
import type { DimensionAssessment } from "./evaluator.js";

const baseScores: DimensionAssessment[] = [
  {
    dimension: "contextual_accuracy",
    score: 4,
    reasoning: "Understands the context.",
  },
  {
    dimension: "relevance",
    score: 5,
    reasoning: "Relevant to the latest message.",
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
    reasoning: "Encourages continuation.",
  },
  {
    dimension: "boundary_awareness",
    score: 5,
    reasoning: "Respects boundaries.",
  },
];

function createScenario(
  scenarioId: string,
  score: number,
): ScenarioReportInput {
  const scores = baseScores.map((item) => ({
    ...item,
    score,
  }));

  return {
    scenarioId,
    assessments: [0, 1, 2].map((suggestionIndex) => ({
      scenarioId,
      suggestionIndex,
      scores,
      criticalBoundaryViolation: false,
      overallFeedback: "Acceptable suggestion.",
    })),
  };
}

describe("Evaluation Report Generator", () => {
  it("generates correct overall metrics", () => {
    const report = generateEvaluationReport([
      createScenario("SC001", 5),
      createScenario("SC002", 4),
    ]);

    expect(report.totalScenarios).toBe(2);
    expect(report.totalSuggestions).toBe(6);
    expect(report.passedScenarios).toBe(2);
    expect(report.failedScenarios).toBe(0);
    expect(report.passRate).toBe(100);
    expect(report.averageScore).toBe(90);
  });

  it("calculates dimension averages", () => {
    const report = generateEvaluationReport([
      createScenario("SC001", 5),
      createScenario("SC002", 3),
    ]);

    expect(
      report.dimensionReports.find(
        (item) => item.dimension === "naturalness",
      )?.averageScore,
    ).toBe(4);
  });

  it("identifies best and worst scenarios", () => {
    const report = generateEvaluationReport([
      createScenario("SC001", 3),
      createScenario("SC002", 5),
    ]);

    expect(report.bestScenario?.scenarioId).toBe("SC002");
    expect(report.worstScenario?.scenarioId).toBe("SC001");
  });

  it("counts critical boundary violations", () => {
    const scenario = createScenario("SC001", 5);

    scenario.assessments[0].criticalBoundaryViolation = true;
    scenario.assessments[0].boundaryViolationReason =
      "Ignored an explicit request to stop messaging.";

    const report = generateEvaluationReport([scenario]);

    expect(report.boundaryViolations).toBe(1);
    expect(report.failedScenarios).toBe(1);
  });

  it("rejects an empty scenario collection", () => {
    expect(() => generateEvaluationReport([])).toThrow(
      /without scenarios/,
    );
  });

  it("rejects duplicate scenario IDs", () => {
    expect(() =>
      generateEvaluationReport([
        createScenario("SC001", 5),
        createScenario("SC001", 4),
      ]),
    ).toThrow(/Duplicate scenario IDs/);
  });

  it("generates a readable Markdown report", () => {
    const report = generateEvaluationReport([
      createScenario("SC001", 5),
    ]);

    const markdown = generateMarkdownReport(report);

    expect(markdown).toContain("# Conversation Evaluation Report");
    expect(markdown).toContain("Total scenarios");
    expect(markdown).toContain("Critical boundary violations");
    expect(markdown).toContain("contextual_accuracy");
    expect(markdown).toContain("SC001");
  });
});
