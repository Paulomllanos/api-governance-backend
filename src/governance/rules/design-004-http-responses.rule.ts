
import type {
  GovernanceRule,
  GovernanceRuleEvaluation,
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import {
  isOpenApiObject,
  resolveLocalRef,
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

function isValidResponseCode(code: string): boolean {
  if (code === 'default') return true;

  if (/^[1-5]XX$/.test(code)) return true;

  return /^[1-5]\d{2}$/.test(code);
}

export class Design004HttpResponsesRule
  implements GovernanceRule
{
  readonly id = 'DESIGN-004';

  readonly name = 'Documentación de respuestas HTTP';

  readonly description =
    'Las operaciones deben declarar respuestas HTTP válidas con descripción.';

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
        message: 'La especificación no contiene paths válido.',
        evidence: 'paths',
        recommendation:
          'Define correctamente las rutas de la API.',
      };
    }

    const findings: string[] = [];
    const unresolved: string[] = [];

    let evaluatedOperations = 0;
    let evaluatedResponses = 0;

    for (const [path, pathItem] of Object.entries(paths)) {
      if (!isOpenApiObject(pathItem)) {
        findings.push(`${path}: definición de ruta inválida.`);
        continue;
      }

      if (typeof pathItem.$ref === 'string') {
        unresolved.push(
          `${path}: referencia de Path Item pendiente de resolver.`,
        );
        continue;
      }

      for (const method of HTTP_METHODS) {
        const operation = pathItem[method];

        if (operation === undefined) continue;

        const location = `${method.toUpperCase()} ${path}`;
        evaluatedOperations++;

        if (!isOpenApiObject(operation)) {
          findings.push(
            `${location}: operación inválida.`,
          );
          continue;
        }

        const responses = operation.responses;

        if (!isOpenApiObject(responses)) {
          findings.push(
            `${location}: falta un objeto responses válido.`,
          );
          continue;
        }

        const entries = Object.entries(responses);

        if (entries.length === 0) {
          findings.push(
            `${location}: responses está vacío.`,
          );
          continue;
        }

        for (const [code, response] of entries) {
          evaluatedResponses++;

          if (!isValidResponseCode(code)) {
            findings.push(
              `${location}: código de respuesta "${code}" inválido.`,
            );
            continue;
          }

          if (!isOpenApiObject(response)) {
            findings.push(
              `${location}: respuesta ${code} inválida.`,
            );
            continue;
          }

          let resolvedResponse = response;

          if (typeof response.$ref === 'string') {
            const resolution = resolveLocalRef(
              response.$ref,
              specification,
            );

            if (resolution.status === 'UNRESOLVED') {
              unresolved.push(
                `${location}, respuesta ${code}: ${resolution.reason}`,
              );
              continue;
            }

            resolvedResponse = resolution.value;
          }

          const description = resolvedResponse.description;

          if (
            typeof description !== 'string' ||
            !description.trim()
          ) {
            findings.push(
              `${location}: la respuesta ${code} no tiene descripción.`,
            );
          }
        }
      }
    }

    if (findings.length > 0) {
      return {
        status: 'FAIL',
        message:
          `Se detectaron ${findings.length} incumplimientos en respuestas HTTP.`,
        evidence: JSON.stringify({
          findings,
          unresolved,
        }),
        recommendation:
          'Declara respuestas HTTP válidas y agrega una descripción a cada respuesta.',
      };
    }

    if (unresolved.length > 0) {
      return {
        status: 'WARNING',
        message:
          'Existen referencias que impiden verificar completamente las respuestas HTTP.',
        evidence: JSON.stringify(unresolved),
        recommendation:
          'Corrige las referencias o incorpora las definiciones faltantes.',
      };
    }

    if (evaluatedOperations === 0) {
      return {
        status: 'NOT_APPLICABLE',
        message:
          'No hay operaciones HTTP para evaluar.',
      };
    }

    return {
      status: 'PASS',
      message:
        `Se verificaron ${evaluatedResponses} respuestas HTTP en ${evaluatedOperations} operaciones.`,
    };
  }
}
