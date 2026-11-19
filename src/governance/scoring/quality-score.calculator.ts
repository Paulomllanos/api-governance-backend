
import type {
  GovernanceRuleResult,
} from '../interfaces/governance-result.interface.js';

export interface QualityScoreResult {
  score: number | null;
  applicableRules: number;
  excludedRules: number;
  totalWeight: number;
  hasCriticalFailures: boolean;
}

const COMPLIANCE_FACTORS = {
  PASS: 1,
  WARNING: 0.5,
  FAIL: 0,
} as const;

export function calculateQualityScore(
  results: readonly GovernanceRuleResult[],
): QualityScoreResult {
  let weightedPoints = 0;
  let totalWeight = 0;
  let applicableRules = 0;
  let excludedRules = 0;
  let hasCriticalFailures = false;

  for (const result of results) {
    if (
      !Number.isFinite(result.weight) ||
      result.weight <= 0
    ) {
      throw new Error(
        `La regla ${result.ruleId} tiene un peso inválido.`,
      );
    }

    if (result.status === 'NOT_APPLICABLE') {
      excludedRules++;
      continue;
    }

    const factor = COMPLIANCE_FACTORS[result.status];

    if (factor === undefined) {
      throw new Error(
        `La regla ${result.ruleId} tiene un estado desconocido.`,
      );
    }

    applicableRules++;
    totalWeight += result.weight;
    weightedPoints += result.weight * factor;

    if (
      result.status === 'FAIL' &&
      result.severity === 'CRITICAL'
    ) {
      hasCriticalFailures = true;
    }
  }

  const score =
    totalWeight === 0
      ? null
      : Math.round(
          (weightedPoints / totalWeight) * 10000,
        ) / 100;

  return {
    score,
    applicableRules,
    excludedRules,
    totalWeight,
    hasCriticalFailures,
  };
}
