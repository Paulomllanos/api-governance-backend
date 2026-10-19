
import type {
  GovernanceRule,
} from '../interfaces/governance-rule.interface.js';

import {
  Design001PathNamingRule,
} from '../rules/design-001-path-naming.rule.js';

import {
  Design002PathParametersRule,
} from '../rules/design-002-path-parameters.rule.js';

import {
  Design003OperationIdRule,
} from '../rules/design-003-operation-id.rule.js';

import {
  Design004HttpResponsesRule,
} from '../rules/design-004-http-responses.rule.js';

import {
  Documentation001OperationDescriptionRule,
} from '../rules/documentation-001-operation-description.rule.js';

import {
  Documentation002ParameterDescriptionRule,
} from '../rules/documentation-002-parameter-description.rule.js';

export const GOVERNANCE_RULES: readonly GovernanceRule[] = [
  new Design001PathNamingRule(),
  new Design002PathParametersRule(),
  new Design003OperationIdRule(),
  new Design004HttpResponsesRule(),
  new Documentation001OperationDescriptionRule(),
  new Documentation002ParameterDescriptionRule(),
];

export function getGovernanceRules(): GovernanceRule[] {
  return [...GOVERNANCE_RULES];
}
