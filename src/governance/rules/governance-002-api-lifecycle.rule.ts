
import type {
  GovernanceRule,
  GovernanceRuleEvaluation,
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import type {
  GovernanceEvaluationContext,
} from '../interfaces/governance-evaluation-context.interface.js';

const VALID_STATUSES = [
  'DRAFT',
  'ACTIVE',
  'DEPRECATED',
] as const;

export class Governance002ApiLifecycleRule
  implements GovernanceRule
{
  readonly id = 'GOVERNANCE-002';

  readonly name = 'Estado de ciclo de vida de la API';

  readonly description =
    'La API debe tener un estado de ciclo de vida reconocido por la plataforma.';

  readonly category = 'GOVERNANCE' as const;

  readonly severity = 'MEDIUM' as const;

  readonly weight = 1;

  evaluate(
    _specification: OpenApiSpecification,
    context?: GovernanceEvaluationContext,
  ): GovernanceRuleEvaluation {
    const status = context?.apiLifecycleStatus;

    if (status === undefined) {
      return {
        status: 'WARNING',
        message:
          'No se recibió el estado del ciclo de vida de la API.',
        recommendation:
          'Incluye Api.status en el contexto de evaluación.',
      };
    }

    if (
      typeof status !== 'string' ||
      !VALID_STATUSES.some(
        (validStatus) => validStatus === status,
      )
    ) {
      return {
        status: 'FAIL',
        message:
          'La API tiene un estado de ciclo de vida no reconocido.',
        evidence: JSON.stringify({
          field: 'Api.status',
          value: status,
          allowedValues: VALID_STATUSES,
        }),
        recommendation:
          'Utiliza uno de los estados admitidos: DRAFT, ACTIVE o DEPRECATED.',
      };
    }

    return {
      status: 'PASS',
      message:
        `La API tiene un estado de ciclo de vida válido: ${status}.`,
      evidence: JSON.stringify({
        field: 'Api.status',
        value: status,
      }),
    };
  }
}
