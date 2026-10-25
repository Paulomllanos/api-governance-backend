
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

function isErrorResponse(code: string): boolean {
  return (
    code === 'default' ||
    /^[45][0-9]{2}$/.test(code) ||
    /^[45]XX$/i.test(code)
  );
}

function resolveLocalObject(
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
      .map((part) =>
        part.replace(/~1/g, '/').replace(/~0/g, '~'),
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

export class Observability002ErrorTraceabilityRule
  implements GovernanceRule
{
  readonly id = 'OBSERVABILITY-002';

  readonly name = 'Trazabilidad de respuestas de error';

  readonly description =
    'Las respuestas de error deben documentar el header X-Correlation-ID.';

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
    let checkedErrorResponses = 0;

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

        if (!isOpenApiObject(operation.responses)) {
          findings.push(
            `${location}: no declara responses válidas.`,
          );
          continue;
        }

        const errorResponses = Object.entries(
          operation.responses,
        ).filter(([code]) => isErrorResponse(code));

        if (errorResponses.length === 0) {
          findings.push(
            `${location}: no documenta respuestas 4xx, 5xx o default.`,
          );
          continue;
        }

        for (const [code, rawResponse] of errorResponses) {
          const responseLocation = `${location} [${code}]`;

          const response = resolveLocalObject(
            specification,
            rawResponse,
          );

          if (!response) {
            unresolved.push(
              `${responseLocation}: respuesta no resoluble.`,
            );
            continue;
          }

          checkedErrorResponses++;

          const headers = response.headers;

          if (!isOpenApiObject(headers)) {
            findings.push(
              `${responseLocation}: falta headers.X-Correlation-ID.`,
            );
            continue;
          }

          const correlationEntry = Object.entries(headers)
            .find(
              ([name]) =>
                name.toLowerCase() === CORRELATION_HEADER,
            );

          if (!correlationEntry) {
            findings.push(
              `${responseLocation}: falta X-Correlation-ID.`,
            );
            continue;
          }

          const header = resolveLocalObject(
            specification,
            correlationEntry[1],
          );

          if (!header) {
            unresolved.push(
              `${responseLocation}: referencia del header no resoluble.`,
            );
            continue;
          }

          if (
            typeof header.description !== 'string' ||
            !header.description.trim()
          ) {
            findings.push(
              `${responseLocation}: X-Correlation-ID no tiene description.`,
            );
          }

          if (
            !isOpenApiObject(header.schema) &&
            !isOpenApiObject(header.content)
          ) {
            findings.push(
              `${responseLocation}: X-Correlation-ID no declara schema ni content.`,
            );
          }
        }
      }
    }

    if (findings.length > 0) {
      return {
        status: 'FAIL',
        message:
          `Se detectaron ${findings.length} incumplimientos de trazabilidad de errores.`,
        evidence: JSON.stringify(findings),
        recommendation:
          'Documenta respuestas de error 4xx, 5xx o default ' +
          'y declara X-Correlation-ID en headers, ' +
          'incluyendo su descripción y schema.',
      };
    }

    if (unresolved.length > 0) {
      return {
        status: 'WARNING',
        message:
          'No fue posible verificar todas las respuestas de error.',
        evidence: JSON.stringify(unresolved),
        recommendation:
          'Resuelve las referencias locales de respuestas y headers.',
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
        `Se verificaron ${checkedErrorResponses} respuestas de error en ${checkedOperations} operaciones.`,
    };
  }
}
