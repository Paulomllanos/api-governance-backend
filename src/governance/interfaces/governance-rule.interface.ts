import type {
  GovernanceEvaluationContext,
} from './governance-evaluation-context.interface.js';

export type GovernanceRuleCategory =
  | 'DESIGN'
  | 'DOCUMENTATION'
  | 'SECURITY'
  | 'VERSIONING'
  | 'OBSERVABILITY'
  | 'GOVERNANCE';

export type GovernanceRuleSeverity =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type OpenApiSpecification =
  Record<string, unknown>;

export interface GovernanceRuleEvaluation {
  status:
  | 'PASS'
  | 'FAIL'
  | 'WARNING'
  | 'NOT_APPLICABLE';

  message: string;
  evidence?: string;
  recommendation?: string;
}

export interface GovernanceRule {
  id: string;
  name: string;
  description: string;
  category: GovernanceRuleCategory;
  severity: GovernanceRuleSeverity;
  weight: number;


  evaluate(
    specification: OpenApiSpecification,
    context?: GovernanceEvaluationContext,
  ): GovernanceRuleEvaluation;

}
