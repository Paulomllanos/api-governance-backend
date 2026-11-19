
export type QualityRuleStatus =
  | 'PASS'
  | 'WARNING'
  | 'FAIL'
  | 'NOT_APPLICABLE';

export type QualityRuleSeverity =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export interface QualityRuleInput {
  ruleId: string;
  status: QualityRuleStatus;
  severity: QualityRuleSeverity;
  weight: number;
}

export interface FinalQualityScore {
  score: number | null;
  applicableRules: number;
  excludedRules: number;
  earnedPoints: number;
  possiblePoints: number;
  blockingRuleIds: string[];
  hasBlockingIssues: boolean;
}

const STATUS_FACTORS: Record<
  Exclude<QualityRuleStatus, 'NOT_APPLICABLE'>,
  number
> = {
  PASS: 1,
  WARNING: 0.5,
  FAIL: 0,
};

const BLOCKING_SEVERITIES = new Set<
  QualityRuleSeverity
>(['CRITICAL', 'HIGH']);

function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateFinalQualityScore(
  rules: readonly QualityRuleInput[],
): FinalQualityScore {
  let earnedPoints = 0;
  let possiblePoints = 0;
  let applicableRules = 0;
  let excludedRules = 0;

  const blockingRuleIds: string[] = [];

  for (const rule of rules) {
    if (
      !Number.isFinite(rule.weight) ||
      rule.weight <= 0
    ) {
      throw new Error(
        `Peso inválido para la regla ${rule.ruleId}.`,
      );
    }

    if (rule.status === 'NOT_APPLICABLE') {
      excludedRules++;
      continue;
    }

    const factor = STATUS_FACTORS[rule.status];

    if (factor === undefined) {
      throw new Error(
        `Estado inválido para la regla ${rule.ruleId}.`,
      );
    }

    applicableRules++;
    earnedPoints += rule.weight * factor;
    possiblePoints += rule.weight;

    if (
      rule.status === 'FAIL' &&
      BLOCKING_SEVERITIES.has(rule.severity)
    ) {
      blockingRuleIds.push(rule.ruleId);
    }
  }

  const score =
    possiblePoints > 0
      ? roundToTwoDecimals(
          (earnedPoints / possiblePoints) * 100,
        )
      : null;

  return {
    score,
    applicableRules,
    excludedRules,
    earnedPoints: roundToTwoDecimals(earnedPoints),
    possiblePoints: roundToTwoDecimals(possiblePoints),
    blockingRuleIds,
    hasBlockingIssues: blockingRuleIds.length > 0,
  };
}
