
import type {
  GovernanceRule,
  GovernanceRuleEvaluation,
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import {
  isOpenApiObject,
} from '../utils/resolve-local-ref.js';

const HTTP_METHODS = new Set([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'trace',
]);

export class Design003OperationIdRule
  implements GovernanceRule
{
  readonly id = 'DESIGN-003';

  readonly name = 'Identificadores únicos de operación';

  readonly description =
    'Cada operación HTTP debe tener un operationId no vacío y único.';

  readonly category = 'DESIGN' as const;

  readonly severity = 'HIGH' as const;

  readonly weight = 1;

  evaluate(
    specification: OpenApiSpecification,
  ): GovernanceRuleEvaluation {
    const paths = specification.paths;

    if (!isOpenApiObject(paths)) {
      return {
        status: 'FAIL',
        message: 'La especificación no contiene un objeto paths válido.',
        evidence: 'paths',
        recommendation:
          'Declara correctamente el objeto paths.',
      };
    }

    const identifiers = new Map<string, string>();
    const findings: string[] = [];
    const unresolved: string[] = [];

    let totalOperations = 0;

    for (const [path, pathItem] of Object.entries(paths)) {
      if (!isOpenApiObject(pathItem)) {
        findings.push(`${path}: definición de ruta inválida.`);
        continue;
      }

      // Por ahora no resolvemos referencias al Path Item.
      if (typeof pathItem.$ref === 'string') {
        unresolved.push(
          `${path}: Path Item referenciado mediante $ref.`,
        );
        continue;
      }

      for (const [method, operation] of Object.entries(pathItem)) {
        if (!HTTP_METHODS.has(method.toLowerCase())) {
          continue;
        }

        const location = `${method.toUpperCase()} ${path}`;
        totalOperations++;

        if (!isOpenApiObject(operation)) {
          findings.push(
            `${location}: la operación no es un objeto válido.`,
          );
          continue;
        }

        const operationId = operation.operationId;

        if (
          typeof operationId !== 'string' ||
          !operationId.trim()
        ) {
          findings.push(
            `${location}: falta un operationId válido.`,
          );
          continue;
        }

        if (identifiers.has(operationId)) {
          findings.push(
            `${location}: operationId "${operationId}" duplicado; ` +
            `ya está declarado en ${identifiers.get(operationId)}.`,
          );
          continue;
        }

        identifiers.set(operationId, location);
      }
    }

    if (findings.length > 0) {
      return {
        status: 'FAIL',
        message:
          `Se detectaron ${findings.length} incumplimientos de operationId.`,
        evidence: JSON.stringify({
          findings,
          unresolved,
        }),
        recommendation:
          'Asigna a cada operación un operationId obligatorio, no vacío y único.',
      };
    }

    if (unresolved.length > 0) {
      return {
        status: 'WARNING',
        message:
          'Existen Path Items referenciados que impiden completar la evaluación.',
        evidence: JSON.stringify(unresolved),
        recommendation:
          'Resuelve las referencias de Path Items antes de confirmar el cumplimiento.',
      };
    }

    if (totalOperations === 0) {
      return {
        status: 'NOT_APPLICABLE',
        message:
          'No existen operaciones HTTP para evaluar.',
      };
    }

    return {
      status: 'PASS',
      message:
        `Las ${totalOperations} operaciones HTTP tienen identificadores únicos.`,
      evidence: JSON.stringify(
        Array.from(identifiers.entries()),
      ),
    };
  }
}
