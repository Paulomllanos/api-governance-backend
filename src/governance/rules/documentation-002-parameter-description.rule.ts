
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

function resolveParameter(
  specification: OpenApiSpecification,
  parameter: unknown,
): Record<string, unknown> | null {
  if (!isOpenApiObject(parameter)) {
    return null;
  }

  if (typeof parameter.$ref !== 'string') {
    return parameter;
  }

  const reference = parameter.$ref;

  if (!reference.startsWith('#/')) {
    return null;
  }

  const segments = reference
    .slice(2)
    .split('/')
    .map((segment) =>
      segment.replace(/~1/g, '/').replace(/~0/g, '~'),
    );

  let current: unknown = specification;

  // Protección contra referencias circulares.
  const visited = new Set<string>();

  for (let depth = 0; depth < 10; depth++) {
    for (const segment of segments) {
      if (!isOpenApiObject(current)) {
        return null;
      }

      current = current[segment];
    }

    if (!isOpenApiObject(current)) {
      return null;
    }

    if (typeof current.$ref !== 'string') {
      return current;
    }

    const nextReference = current.$ref;

    if (
      !nextReference.startsWith('#/') ||
      visited.has(nextReference)
    ) {
      return null;
    }

    visited.add(nextReference);

    segments.splice(
      0,
      segments.length,
      ...nextReference
        .slice(2)
        .split('/')
        .map((segment) =>
          segment.replace(/~1/g, '/').replace(/~0/g, '~'),
        ),
    );

    current = specification;
  }

  return null;
}

export class Documentation002ParameterDescriptionRule
  implements GovernanceRule
{
  readonly id = 'DOCUMENTATION-002';

  readonly name = 'Descripción de parámetros OpenAPI';

  readonly description =
    'Los parámetros deben incluir una descripción no vacía.';

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
        message: 'La propiedad paths no es válida.',
        evidence: 'paths',
        recommendation:
          'Declara un objeto paths válido.',
      };
    }

    const findings: string[] = [];
    const unresolved: string[] = [];

    let evaluatedParameters = 0;

    const inspectParameters = (
      parameters: unknown,
      location: string,
    ) => {
      if (parameters === undefined) {
        return;
      }

      if (!Array.isArray(parameters)) {
        findings.push(
          `${location}: parameters debe ser un arreglo.`,
        );
        return;
      }

      for (const [index, parameter] of parameters.entries()) {
        const resolved = resolveParameter(
          specification,
          parameter,
        );

        if (!resolved) {
          unresolved.push(
            `${location}: no se pudo resolver el parámetro ${index}.`,
          );
          continue;
        }

        evaluatedParameters++;

        const name =
          typeof resolved.name === 'string'
            ? resolved.name
            : `parámetro ${index}`;

        if (
          typeof resolved.description !== 'string' ||
          !resolved.description.trim()
        ) {
          findings.push(
            `${location}: ${name} no tiene description válida.`,
          );
        }
      }
    };

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

      inspectParameters(
        pathItem.parameters,
        `PATH ${path}`,
      );

      for (const method of HTTP_METHODS) {
        const operation = pathItem[method];

        if (operation === undefined) {
          continue;
        }

        const location = `${method.toUpperCase()} ${path}`;

        if (!isOpenApiObject(operation)) {
          findings.push(
            `${location}: definición de operación inválida.`,
          );
          continue;
        }

        inspectParameters(
          operation.parameters,
          location,
        );
      }
    }

    if (findings.length > 0) {
      return {
        status: 'FAIL',
        message:
          `Se detectaron ${findings.length} problemas en la documentación de parámetros.`,
        evidence: JSON.stringify(findings),
        recommendation:
          'Agrega una propiedad description clara y no vacía a cada parámetro.',
      };
    }

    if (unresolved.length > 0) {
      return {
        status: 'WARNING',
        message:
          'No fue posible verificar todos los parámetros.',
        evidence: JSON.stringify(unresolved),
        recommendation:
          'Revisa las referencias $ref y las definiciones de parámetros.',
      };
    }

    if (evaluatedParameters === 0) {
      return {
        status: 'NOT_APPLICABLE',
        message:
          'No se encontraron parámetros para evaluar.',
      };
    }

    return {
      status: 'PASS',
      message:
        `Los ${evaluatedParameters} parámetros evaluados tienen una descripción válida.`,
    };
  }
}
