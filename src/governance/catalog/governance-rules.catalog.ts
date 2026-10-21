
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

import {
  Documentation003SchemaDescriptionRule,
} from '../rules/documentation-003-schema-description.rule.js';

import {
  Documentation004ApiDescriptionRule,
} from '../rules/documentation-004-api-description.rule.js';

import {
  Security001OperationSecurityRule,
} from '../rules/security-001-operation-security.rule.js';

import {
  Security002SecuritySchemesRule,
} from '../rules/security-002-security-schemes.rule.js';

import {
  Security003OAuthScopesRule,
} from '../rules/security-003-oauth-scopes.rule.js';

import {
  Versioning001VersionConsistencyRule,
} from '../rules/versioning-001-version-consistency.rule.js';

export const GOVERNANCE_RULES: readonly GovernanceRule[] = [
  new Design001PathNamingRule(),
  new Design002PathParametersRule(),
  new Design003OperationIdRule(),
  new Design004HttpResponsesRule(),
  new Documentation001OperationDescriptionRule(),
  new Documentation002ParameterDescriptionRule(),
  new Documentation003SchemaDescriptionRule(),
  new Documentation004ApiDescriptionRule(),
  new Security001OperationSecurityRule(),
  new Security002SecuritySchemesRule(),
  new Security003OAuthScopesRule(),
  new Versioning001VersionConsistencyRule(),

];

export function getGovernanceRules(): GovernanceRule[] {
  return [...GOVERNANCE_RULES];
}
