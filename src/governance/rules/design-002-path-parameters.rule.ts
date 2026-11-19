
import type {
  GovernanceRule,
  GovernanceRuleEvaluation,
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import {
  isOpenApiObject,
  resolveLocalRef,
  type OpenApiObject,
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

type ParameterResolution =
  | { status: 'RESOLVED'; value: OpenApiObject }
  | { status: 'UNRESOLVED'; reason: string };

function resolveParameter(
  parameter: unknown,
  specification: OpenApiSpecification,
): ParameterResolution {
  if (!isOpenApiObject(parameter)) {
    return {
      status: 'UNRESOLVED',
      reason: 'La declaración del parámetro no es un objeto.',
    };
  }

  if (typeof parameter.$ref === 'string') {
    return resolveLocalRef(parameter.$ref, specification);
  }

  return {
    status: 'RESOLVED',
    value: parameter,
  };
}

export class Design002PathParametersRule
  implements GovernanceRule
{
  readonly id = 'DESIGN-002';
  readonly name = 'Declaración de parámetros de ruta';
  readonly description =
    'Los parámetros de URL deben declararse con in: path y required: true.';
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
        message: 'La propiedad paths no es un objeto válido.',
        evidence: 'paths',
        recommendation: 'Define un objeto paths válido.',
      };
    }

    const findings: string[] = [];
    const unresolved: string[] = [];
    let evaluated = 0;

    for (const [path, pathItem] of Object.entries(paths)) {
      const templateParameters = [
        ...path.matchAll(/\{([^{}]+)\}/g),
      ].map((match) => match[1]);

      if (templateParameters.length === 0) continue;

      if (!isOpenApiObject(pathItem)) {
        findings.push(`${path}: definición de ruta inválida.`);
        continue;
      }

      const pathParameters = Array.isArray(pathItem.parameters)
        ? pathItem.parameters
        : [];

      for (const method of HTTP_METHODS) {
        const operation = pathItem[method];

        if (operation === undefined) continue;

        if (!isOpenApiObject(operation)) {
          findings.push(
            `${method.toUpperCase()} ${path}: operación inválida.`,
          );
          continue;
        }

        const operationParameters = Array.isArray(
          operation.parameters,
        )
          ? operation.parameters
          : [];

        // OpenAPI permite que los parámetros de operación
        // sobrescriban los definidos a nivel de ruta.
        const resolvedParameters = [
          ...pathParameters,
          ...operationParameters,
        ].map((parameter, index) => ({
          ...resolveParameter(parameter, specification),
          source:
            index < pathParameters.length
              ? 'PATH'
              : 'OPERATION',
        }));

        for (const parameterName of templateParameters) {
          evaluated++;

          const matchingParameters = resolvedParameters
            .filter(
              (item) =>
                item.status === 'RESOLVED' &&
                item.value.name === parameterName &&
                item.value.in === 'path',
            );

          const operationMatch = matchingParameters.findLast(
            (item) => item.source === 'OPERATION',
          );

          const matching =
            operationMatch ?? matchingParameters.at(-1);

          const unresolvedParameters =
            resolvedParameters.filter(
              (item) => item.status === 'UNRESOLVED',
            );

          if (!matching) {
            if (unresolvedParameters.length > 0) {
              unresolved.push(
                `${method.toUpperCase()} ${path}: ` +
                `no se pudo verificar ${parameterName}. ` +
                unresolvedParameters
                  .map((item) => item.status === 'UNRESOLVED'
                    ? item.reason
                    : '')
                  .join('; '),
              );
            } else {
              findings.push(
                `${method.toUpperCase()} ${path}: ` +
                `falta declarar ${parameterName}.`,
              );
            }

            continue;
          }

          if (matching.status === 'RESOLVED' &&
              matching.value.required !== true) {
            findings.push(
              `${method.toUpperCase()} ${path}: ` +
              `${parameterName} debe tener required: true.`,
            );
          }

          // Aunque el parámetro coincida, otros $ref sin
          // resolver pueden afectar la validación global.
          if (unresolvedParameters.length > 0) {
            unresolved.push(
              `${method.toUpperCase()} ${path}: ` +
              'existen referencias de parámetros sin resolver.',
            );
          }
        }
      }
    }

    if (findings.length > 0) {
      return {
        status: 'FAIL',
        message: `Se detectaron ${findings.length} incumplimientos.`,
        evidence: JSON.stringify({
          findings,
          unresolved,
        }),
        recommendation:
          'Declara cada parámetro de URL con in: path y required: true.',
      };
    }

    if (unresolved.length > 0) {
      return {
        status: 'WARNING',
        message:
          'Existen referencias que impiden verificar completamente los parámetros.',
        evidence: JSON.stringify(unresolved),
        recommendation:
          'Corrige las referencias locales o incorpora sus definiciones.',
      };
    }

    if (evaluated === 0) {
      return {
        status: 'NOT_APPLICABLE',
        message:
          'No hay parámetros de ruta en las operaciones evaluadas.',
      };
    }

    return {
      status: 'PASS',
      message:
        `Se verificaron ${evaluated} parámetros de ruta correctamente.`,
    };
  }
}
