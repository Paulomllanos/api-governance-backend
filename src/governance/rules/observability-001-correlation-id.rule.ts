
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

const CORRELATION_HEADER = 'x-correlation-id';

function resolveParameter(
  specification: OpenApiSpecification,
  value: unknown,
): Record<string, unknown> | null {
  let current: unknown = value;
  const visited = new Set<string>();

  for (let depth = 0; depth < 10; depth++) {
    if (!isOpenApiObject(current)) {
      return null;
    }

    if (typeof current.$ref !== 'string') {
      return current;
    }

    const ref = current.$ref;

    if (!ref.startsWith('#/') || visited.has(ref)) {
      return null;
    }

    visited.add(ref);

    const segments = ref
      .slice(2)
      .split('/')
      .map((segment) =>
        segment.replace(/~1/g, '/').replace(/~0/g, '~'),
      );

    let resolved: unknown = specification;

    for (const segment of segments) {
      if (!isOpenApiObject(resolved)) {
        return null;
      }

      resolved = resolved[segment];
    }

    current = resolved;
  }

  return null;
}

type ParameterCheck = {
  found: boolean;
  unresolved: boolean;
  invalid: boolean;
};

function checkParameters(
  specification: OpenApiSpecification,
  parameters: unknown,
): ParameterCheck {
  if (parameters === undefined) {
    return {
      found: false,
      unresolved: false,
      invalid: false,
    };
  }

  if (!Array.isArray(parameters)) {
    return {
      found: false,
      unresolved: false,
      invalid: true,
    };
  }

  let found = false;
  let unresolved = false;
  let invalid = false;

  for (const parameter of parameters) {
    const resolved = resolveParameter(
      specification,
      parameter,
    );

    if (!resolved) {
      unresolved = true;
      continue;
    }

    if (
      typeof resolved.name !== 'string' ||
      typeof resolved.in !== 'string'
    ) {
      invalid = true;
      continue;
    }

    if (
      resolved.in === 'header' &&
      resolved.name.toLowerCase() === CORRELATION_HEADER
    ) {
      found = true;
    }
  }

  return { found, unresolved, invalid };
}

export class Observability001CorrelationIdRule
  implements GovernanceRule
{
  readonly id = 'OBSERVABILITY-001';

  readonly name = 'Identificador de correlación';

  readonly description =
    'Las operaciones HTTP deben documentar el header X-Correlation-ID.';

  readonly category = 'OBSERVABILITY' as const;

  readonly severity = 'MEDIUM' as const;

  readonly weight = 1;

  evaluate(
    specification: OpenApiSpecification,
  ): GovernanceRuleEvaluation {
    const paths = specification.paths;

    if (!isOpenApiObject(paths)) {
      return {
        status: 'FAIL',
        message: 'La propiedad paths no es válida.',
        evidence: 'paths',
        recommendation:
          'Declara un objeto paths válido.',
      };
    }

    const findings: string[] = [];
    const unresolved: string[] = [];

    let checkedOperations = 0;

    for (const [path, pathItem] of Object.entries(paths)) {
      if (!isOpenApiObject(pathItem)) {
        findings.push(
          `${path}: definición de ruta inválida.`,
        );
        continue;
      }

      if (typeof pathItem.$ref === 'string') {
        unresolved.push(
          `${path}: Path Item referenciado no evaluado.`,
        );
        continue;
      }

      const sharedParameters = checkParameters(
        specification,
        pathItem.parameters,
      );

      for (const method of HTTP_METHODS) {
        const operation = pathItem[method];

        if (operation === undefined) {
          continue;
        }

        const location = `${method.toUpperCase()} ${path}`;

        if (!isOpenApiObject(operation)) {
          findings.push(
            `${location}: operación inválida.`,
          );
          continue;
        }

        checkedOperations++;

        const operationParameters = checkParameters(
          specification,
          operation.parameters,
        );

        if (
          sharedParameters.invalid ||
          operationParameters.invalid
        ) {
          findings.push(
            `${location}: parámetros con estructura inválida.`,
          );
          continue;
        }

        if (
          sharedParameters.found ||
          operationParameters.found
        ) {
          continue;
        }

        if (
          sharedParameters.unresolved ||
          operationParameters.unresolved
        ) {
          unresolved.push(
            `${location}: no se pudieron resolver todos los parámetros.`,
          );
          continue;
        }

        findings.push(
          `${location}: falta el header X-Correlation-ID.`,
        );
      }
    }

    if (findings.length > 0) {
      return {
        status: 'FAIL',
        message:
          `Se detectaron ${findings.length} incumplimientos de correlación.`,
        evidence: JSON.stringify(findings),
        recommendation:
          'Declara X-Correlation-ID como parámetro in: header ' +
          'en las operaciones o a nivel de ruta.',
      };
    }

    if (unresolved.length > 0) {
      return {
        status: 'WARNING',
        message:
          'No fue posible verificar la correlación en todas las operaciones.',
        evidence: JSON.stringify(unresolved),
        recommendation:
          'Revisa las referencias $ref y vuelve a evaluar el contrato.',
      };
    }

    if (checkedOperations === 0) {
      return {
        status: 'NOT_APPLICABLE',
        message:
          'No existen operaciones HTTP para evaluar.',
      };
    }

    return {
      status: 'PASS',
      message:
        `Las ${checkedOperations} operaciones evaluadas documentan X-Correlation-ID.`,
    };
  }
}
