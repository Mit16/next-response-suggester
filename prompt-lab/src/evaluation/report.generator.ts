
import {
  evaluateScenario,
  type EvaluationDimension,
  type SuggestionAssessment,
} from "./evaluator.js";

import type {
  EvaluationReport,
  ScenarioReportInput,
} from "./report.types.js";

const DIMENSION_WEIGHTS: Record<EvaluationDimension, number> = {
  contextual_accuracy: 25,
  relevance: 20,
  naturalness: 20,
  tone_consistency: 15,
  engagement: 10,
  boundary_awareness: 10,
};

export function generateEvaluationReport(
  scenarios: ScenarioReportInput[],
): EvaluationReport {
  if (scenarios.length === 0) {
    throw new Error("Cannot generate a report without scenarios.");
  }

  const scenarioIds = scenarios.map((scenario) => scenario.scenarioId);

  if (new Set(scenarioIds).size !== scenarioIds.length) {
    throw new Error("Duplicate scenario IDs detected.");
  }

  const evaluations = scenarios.map((scenario) =>
    evaluateScenario(scenario.scenarioId, scenario.assessments),
  );

  const totalScenarios = evaluations.length;

  const totalSuggestions = evaluations.reduce(
    (total, scenario) => total + scenario.evaluations.length,
    0,
  );

  const passedScenarios = evaluations.filter(
    (scenario) => scenario.passed,
  ).length;

  const failedScenarios = totalScenarios - passedScenarios;

  const averageScore =
    evaluations.reduce(
      (total, scenario) => total + scenario.averageScore,
      0,
    ) / totalScenarios;

  const boundaryViolations = evaluations.reduce(
    (total, scenario) =>
      total +
      scenario.evaluations.filter(
        (evaluation) => evaluation.criticalBoundaryViolation,
      ).length,
    0,
  );

  const dimensionReports = (
    Object.keys(DIMENSION_WEIGHTS) as EvaluationDimension[]
  ).map((dimension) => {
    const scores = evaluations.flatMap((scenario) =>
      scenario.evaluations.flatMap((evaluation) =>
        evaluation.scores.filter(
          (score) => score.dimension === dimension,
        ),
      ),
    );

    const dimensionAverage =
      scores.reduce((total, score) => total + score.score, 0) /
      scores.length;

    return {
      dimension,
      averageScore: Number(dimensionAverage.toFixed(2)),
      weight: DIMENSION_WEIGHTS[dimension],
    };
  });

  const sortedEvaluations = [...evaluations].sort(
    (a, b) => b.averageScore - a.averageScore,
  );

  const best = sortedEvaluations[0];
  const worst = sortedEvaluations[sortedEvaluations.length - 1];

  return {
    generatedAt: new Date().toISOString(),
    totalScenarios,
    totalSuggestions,
    passedScenarios,
    failedScenarios,
    passRate: Number(
      ((passedScenarios / totalScenarios) * 100).toFixed(2),
    ),
    averageScore: Number(averageScore.toFixed(2)),
    boundaryViolations,
    dimensionReports,
    bestScenario: best
      ? {
          scenarioId: best.scenarioId,
          averageScore: best.averageScore,
        }
      : null,
    worstScenario: worst
      ? {
          scenarioId: worst.scenarioId,
          averageScore: worst.averageScore,
        }
      : null,
  };
}

export function generateMarkdownReport(
  report: EvaluationReport,
): string {
  const dimensionRows = report.dimensionReports
    .map(
      (dimension) =>
        `| ${dimension.dimension} | ${dimension.averageScore}/5 | ${dimension.weight}% |`,
    )
    .join("\n");

  return `# Conversation Evaluation Report

Generated: ${report.generatedAt}

## Overall Results

| Metric | Result |
|---|---:|
| Total scenarios | ${report.totalScenarios} |
| Total suggestions | ${report.totalSuggestions} |
| Passed scenarios | ${report.passedScenarios} |
| Failed scenarios | ${report.failedScenarios} |
| Pass rate | ${report.passRate}% |
| Average score | ${report.averageScore}/100 |
| Critical boundary violations | ${report.boundaryViolations} |

## Dimension Performance

| Dimension | Average Score | Weight |
|---|---:|---:|
${dimensionRows}

## Scenario Highlights

- Best scenario: ${report.bestScenario?.scenarioId ?? "N/A"} (${report.bestScenario?.averageScore ?? 0}/100)
- Worst scenario: ${report.worstScenario?.scenarioId ?? "N/A"} (${report.worstScenario?.averageScore ?? 0}/100)
`;
}
