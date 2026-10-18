
import type {
  GovernanceRuleCategory,
  GovernanceRuleSeverity,
  GovernanceRuleEvaluation,
} from './governance-rule.interface.js';

export interface GovernanceRuleResult
  extends GovernanceRuleEvaluation {
  ruleId: string;
  ruleName: string;
  category: GovernanceRuleCategory;
  severity: GovernanceRuleSeverity;
  weight: number;
}

export interface GovernanceEngineResult {
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warningRules: number;
  notApplicableRules: number;

  results: GovernanceRuleResult[];
}
