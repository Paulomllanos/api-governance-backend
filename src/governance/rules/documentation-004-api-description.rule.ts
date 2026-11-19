
import type {
  GovernanceRule,
  GovernanceRuleEvaluation,
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import {
  isOpenApiObject,
} from '../utils/resolve-local-ref.js';

export class Documentation004ApiDescriptionRule
  implements GovernanceRule
{
  readonly id = 'DOCUMENTATION-004';

  readonly name = 'Descripción general de la API';

  readonly description =
    'La API debe incluir una descripción general en info.description.';

  readonly category = 'DOCUMENTATION' as const;

  readonly severity = 'MEDIUM' as const;

  readonly weight = 1;

  evaluate(
    specification: OpenApiSpecification,
  ): GovernanceRuleEvaluation {
    const info = specification.info;

    if (!isOpenApiObject(info)) {
      return {
        status: 'FAIL',
        message:
          'El documento no contiene un objeto info válido.',
        evidence: 'info',
        recommendation:
          'Declara el objeto info con una descripción general de la API.',
      };
    }

    const apiDescription = info.description;

    if (
      typeof apiDescription !== 'string' ||
      apiDescription.trim().length === 0
    ) {
      return {
        status: 'FAIL',
        message:
          'La API no tiene una descripción general válida.',
        evidence: JSON.stringify({
          field: 'info.description',
          value: apiDescription ?? null,
        }),
        recommendation:
          'Agrega info.description explicando el propósito, alcance y funcionalidades principales de la API.',
      };
    }

    return {
      status: 'PASS',
      message:
        'La API contiene una descripción general válida.',
      evidence: 'info.description',
    };
  }
}
