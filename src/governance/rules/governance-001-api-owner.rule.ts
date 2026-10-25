
import type {
  GovernanceRule,
  GovernanceRuleEvaluation,
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import type {
  GovernanceEvaluationContext,
} from '../interfaces/governance-evaluation-context.interface.js';

export class Governance001ApiOwnerRule
  implements GovernanceRule
{
  readonly id = 'GOVERNANCE-001';

  readonly name = 'Responsable asignado a la API';

  readonly description =
    'Toda API debe tener un responsable identificado en la plataforma.';

  readonly category = 'GOVERNANCE' as const;

  readonly severity = 'HIGH' as const;

  readonly weight = 1;

  evaluate(
    _specification: OpenApiSpecification,
    context?: GovernanceEvaluationContext,
  ): GovernanceRuleEvaluation {
    const owner = context?.apiOwner;

    if (owner === undefined || owner === null) {
      return {
        status: 'WARNING',
        message:
          'No se recibió información del responsable de la API.',
        recommendation:
          'Incluye el responsable registrado al ejecutar la evaluación.',
      };
    }

    if (
      typeof owner !== 'string' ||
      owner.trim().length === 0 ||
      owner.trim().toLowerCase() === 'unassigned'
    ) {
      return {
        status: 'FAIL',
        message:
          'La API no tiene un responsable válido asignado.',
        evidence: JSON.stringify({
          field: 'Api.owner',
          value: owner,
        }),
        recommendation:
          'Asigna un equipo, área o persona responsable a la API.',
      };
    }

    return {
      status: 'PASS',
      message:
        'La API tiene un responsable registrado.',
      evidence: JSON.stringify({
        field: 'Api.owner',
        value: owner,
      }),
    };
  }
}
