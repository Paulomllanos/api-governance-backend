
import type {
  GovernanceRule,
  GovernanceRuleEvaluation,
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import {
  isOpenApiObject,
} from '../utils/resolve-local-ref.js';

const HTTP_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'head',
  'options',
  'trace',
] as const;

export class Documentation001OperationDescriptionRule
  implements GovernanceRule
{
  readonly id = 'DOCUMENTATION-001';

  readonly name = 'Documentación de operaciones HTTP';

  readonly description =
    'Cada operación debe declarar summary y description no vacíos.';

  readonly category = 'DOCUMENTATION' as const;

  readonly severity = 'MEDIUM' as const;

  readonly weight = 1;

  evaluate(
    specification: OpenApiSpecification,
  ): GovernanceRuleEvaluation {
    const paths = specification.paths;

    if (!isOpenApiObject(paths)) {
      return {
        status: 'FAIL',
        message: 'La propiedad paths no es un objeto válido.',
        evidence: 'paths',
        recommendation:
          'Declara un objeto paths válido en OpenAPI.',
      };
    }

    const findings: string[] = [];
    const unresolved: string[] = [];

    let evaluatedOperations = 0;

    for (const [path, pathItem] of Object.entries(paths)) {
      if (!isOpenApiObject(pathItem)) {
        findings.push(
          `${path}: definición de ruta inválida.`,
        );
        continue;
      }

      if (typeof pathItem.$ref === 'string') {
        unresolved.push(
          `${path}: Path Item con referencia pendiente de resolver.`,
        );
        continue;
      }

      for (const method of HTTP_METHODS) {
        const operation = pathItem[method];

        if (operation === undefined) {
          continue;
        }

        const location = `${method.toUpperCase()} ${path}`;

        evaluatedOperations++;

        if (!isOpenApiObject(operation)) {
          findings.push(
            `${location}: definición de operación inválida.`,
          );
          continue;
        }

        if (
          typeof operation.summary !== 'string' ||
          !operation.summary.trim()
        ) {
          findings.push(
            `${location}: falta summary o está vacío.`,
          );
        }

        if (
          typeof operation.description !== 'string' ||
          !operation.description.trim()
        ) {
          findings.push(
            `${location}: falta description o está vacía.`,
          );
        }
      }
    }

    if (findings.length > 0) {
      return {
        status: 'FAIL',
        message:
          `Se detectaron ${findings.length} incumplimientos de documentación.`,
        evidence: JSON.stringify(findings),
        recommendation:
          'Agrega summary y description a cada operación HTTP.',
      };
    }

    if (unresolved.length > 0) {
      return {
        status: 'WARNING',
        message:
          'Existen referencias de Path Item que impiden verificar toda la documentación.',
        evidence: JSON.stringify(unresolved),
        recommendation:
          'Resuelve las referencias antes de confirmar el cumplimiento.',
      };
    }

    if (evaluatedOperations === 0) {
      return {
        status: 'NOT_APPLICABLE',
        message:
          'No existen operaciones HTTP para evaluar.',
      };
    }

    return {
      status: 'PASS',
      message:
        `Las ${evaluatedOperations} operaciones HTTP cuentan con summary y description.`,
    };
  }
}
