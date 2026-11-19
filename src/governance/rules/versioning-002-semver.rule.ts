
import type {
  GovernanceRule,
  GovernanceRuleEvaluation,
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import {
  isOpenApiObject,
} from '../utils/resolve-local-ref.js';

const NUMERIC_IDENTIFIER = '(?:0|[1-9][0-9]*)';
const ALPHANUMERIC_IDENTIFIER = '[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*';

const PRERELEASE_IDENTIFIER =
  `(?:${NUMERIC_IDENTIFIER}|${ALPHANUMERIC_IDENTIFIER})`;

const BUILD_IDENTIFIER = '[0-9A-Za-z-]+';

const SEMVER_PATTERN = new RegExp(
  '^' +
    `${NUMERIC_IDENTIFIER}\\.` +
    `${NUMERIC_IDENTIFIER}\\.` +
    `${NUMERIC_IDENTIFIER}` +
    `(?:-${PRERELEASE_IDENTIFIER}(?:\\.${PRERELEASE_IDENTIFIER})*)?` +
    `(?:\\+${BUILD_IDENTIFIER}(?:\\.${BUILD_IDENTIFIER})*)?` +
  '$',
);

export class Versioning002SemverRule
  implements GovernanceRule
{
  readonly id = 'VERSIONING-002';

  readonly name = 'Formato de versionamiento semántico';

  readonly description =
    'info.version debe cumplir con Semantic Versioning 2.0.0.';

  readonly category = 'VERSIONING' as const;

  readonly severity = 'MEDIUM' as const;

  readonly weight = 1;

  evaluate(
    specification: OpenApiSpecification,
  ): GovernanceRuleEvaluation {
    const info = specification.info;

    const version = isOpenApiObject(info)
      ? info.version
      : undefined;

    if (
      typeof version !== 'string' ||
      version.length === 0
    ) {
      return {
        status: 'FAIL',
        message:
          'El documento no contiene una versión válida en info.version.',
        evidence: 'info.version',
        recommendation:
          'Declara info.version utilizando el formato MAJOR.MINOR.PATCH.',
      };
    }

    if (!SEMVER_PATTERN.test(version)) {
      return {
        status: 'FAIL',
        message:
          'La versión del documento no cumple con SemVer 2.0.0.',
        evidence: JSON.stringify({
          field: 'info.version',
          value: version,
        }),
        recommendation:
          'Utiliza MAJOR.MINOR.PATCH, por ejemplo 1.2.0. ' +
          'Puedes agregar identificadores válidos como -beta.1 ' +
          'o metadatos como +build.45.',
      };
    }

    return {
      status: 'PASS',
      message:
        `La versión ${version} cumple con SemVer 2.0.0.`,
      evidence: JSON.stringify({
        field: 'info.version',
        value: version,
      }),
    };
  }
}
