
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

type SecurityCheck =
  | 'PROTECTED'
  | 'PUBLIC'
  | 'INVALID'
  | 'UNDEFINED';

function inspectSecurity(value: unknown): SecurityCheck {
  if (value === undefined) {
    return 'UNDEFINED';
  }

  if (!Array.isArray(value)) {
    return 'INVALID';
  }

  if (value.length === 0) {
    return 'PUBLIC';
  }

  for (const requirement of value) {
    if (!isOpenApiObject(requirement)) {
      return 'INVALID';
    }

    const schemes = Object.entries(requirement);

    // En OpenAPI, {} permite acceso anónimo.
    if (schemes.length === 0) {
      return 'PUBLIC';
    }

    for (const [name, scopes] of schemes) {
      if (
        !name.trim() ||
        !Array.isArray(scopes) ||
        !scopes.every((scope) => typeof scope === 'string')
      ) {
        return 'INVALID';
      }
    }
  }

  return 'PROTECTED';
}

export class Security001OperationSecurityRule
  implements GovernanceRule
{
  readonly id = 'SECURITY-001';

  readonly name = 'Seguridad declarada en operaciones';

  readonly description =
    'Cada operación HTTP debe exigir un requisito de seguridad.';

  readonly category = 'SECURITY' as const;

  readonly severity = 'HIGH' as const;

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
          'Declara correctamente las rutas de la API.',
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

        const effectiveSecurity =
          operation.security !== undefined
            ? operation.security
            : specification.security;

        const assessment = inspectSecurity(
          effectiveSecurity,
        );

        if (assessment === 'UNDEFINED') {
          findings.push(
            `${location}: no declara seguridad global ni por operación.`,
          );
        } else if (assessment === 'PUBLIC') {
          findings.push(
            `${location}: permite acceso sin requisito de autenticación.`,
          );
        } else if (assessment === 'INVALID') {
          findings.push(
            `${location}: declaración security inválida.`,
          );
        }
      }
    }

    if (findings.length > 0) {
      return {
        status: 'FAIL',
        message:
          `Se detectaron ${findings.length} incumplimientos de seguridad.`,
        evidence: JSON.stringify(findings),
        recommendation:
          'Define requisitos de seguridad obligatorios en cada operación, directamente o mediante security global. Elimina las alternativas anónimas cuando no estén permitidas.',
      };
    }

    if (unresolved.length > 0) {
      return {
        status: 'WARNING',
        message:
          'No fue posible comprobar la seguridad de todas las rutas referenciadas.',
        evidence: JSON.stringify(unresolved),
        recommendation:
          'Resuelve los Path Items referenciados y vuelve a evaluar el documento.',
      };
    }

    if (checkedOperations === 0) {
      return {
        status: 'NOT_APPLICABLE',
        message:
          'No se encontraron operaciones HTTP para evaluar.',
      };
    }

    return {
      status: 'PASS',
      message:
        `Las ${checkedOperations} operaciones evaluadas declaran requisitos de seguridad.`,
    };
  }
}
