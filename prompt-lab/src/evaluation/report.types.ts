
import type {
  EvaluationDimension,
  SuggestionAssessment,
} from "./evaluator.js";

export interface DimensionReport {
  dimension: EvaluationDimension;
  averageScore: number;
  weight: number;
}

export interface EvaluationReport {
  generatedAt: string;
  totalScenarios: number;
  totalSuggestions: number;
  passedScenarios: number;
  failedScenarios: number;
  passRate: number;
  averageScore: number;
  boundaryViolations: number;
  dimensionReports: DimensionReport[];
  bestScenario: {
    scenarioId: string;
    averageScore: number;
  } | null;
  worstScenario: {
    scenarioId: string;
    averageScore: number;
  } | null;
}

export interface ScenarioReportInput {
  scenarioId: string;
  assessments: SuggestionAssessment[];
}
