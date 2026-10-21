
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

const OAUTH_FLOWS = [
  'implicit',
  'password',
  'clientCredentials',
  'authorizationCode',
] as const;

export class Security003OAuthScopesRule implements GovernanceRule {
  readonly id = 'SECURITY-003';

  readonly name = 'Consistencia de scopes OAuth2';

  readonly description =
    'Los scopes OAuth2 solicitados deben existir en los flujos declarados.';

  readonly category = 'SECURITY' as const;

  readonly severity = 'HIGH' as const;

  readonly weight = 1;

  evaluate(
    specification: OpenApiSpecification,
  ): GovernanceRuleEvaluation {
    const findings: string[] = [];
    const unresolved: string[] = [];

    const components = specification.components;

    const securitySchemes =
      isOpenApiObject(components) &&
      isOpenApiObject(components.securitySchemes)
        ? components.securitySchemes
        : {};

    const paths = specification.paths;

    if (!isOpenApiObject(paths)) {
      return {
        status: 'FAIL',
        message: 'La propiedad paths no es válida.',
        evidence: 'paths',
        recommendation:
          'Corrige la estructura de paths del contrato OpenAPI.',
      };
    }

    let checkedRequirements = 0;

    const inspectRequirements = (
      requirements: unknown,
      location: string,
    ) => {
      if (!Array.isArray(requirements)) {
        return;
      }

      for (const requirement of requirements) {
        if (!isOpenApiObject(requirement)) {
          continue;
        }

        for (const [schemeName, requestedScopes] of Object.entries(
          requirement,
        )) {
          const scheme = securitySchemes[schemeName];

          // SECURITY-002 valida mecanismos inexistentes
          // o con definiciones inválidas.
          if (!isOpenApiObject(scheme)) {
            continue;
          }

          if (scheme.type !== 'oauth2') {
            continue;
          }

          checkedRequirements++;

          if (
            !Array.isArray(requestedScopes) ||
            !requestedScopes.every(
              (scope) => typeof scope === 'string',
            )
          ) {
            findings.push(
              `${location}: scopes inválidos en ${schemeName}.`,
            );
            continue;
          }

          if (!isOpenApiObject(scheme.flows)) {
            findings.push(
              `${location}: ${schemeName} no declara flows válidos.`,
            );
            continue;
          }

          const availableScopes = new Set<string>();
          let validFlowCount = 0;

          for (const flowName of OAUTH_FLOWS) {
            const flow = scheme.flows[flowName];

            if (!isOpenApiObject(flow)) {
              continue;
            }

            if (!isOpenApiObject(flow.scopes)) {
              continue;
            }

            validFlowCount++;

            for (const scopeName of Object.keys(flow.scopes)) {
              availableScopes.add(scopeName);
            }
          }

          if (validFlowCount === 0) {
            findings.push(
              `${location}: ${schemeName} no contiene flujos con scopes válidos.`,
            );
            continue;
          }

          for (const scope of requestedScopes) {
            if (!availableScopes.has(scope)) {
              findings.push(
                `${location}: el scope "${scope}" no está declarado en ${schemeName}.`,
              );
            }
          }
        }
      }
    };

    // Seguridad global: se evalúa como política efectiva
    // solamente cuando la operación no la sobrescribe.
    let checkedOperations = 0;

    for (const [path, pathItem] of Object.entries(paths)) {
      if (!isOpenApiObject(pathItem)) {
        findings.push(`${path}: Path Item inválido.`);
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
          findings.push(`${location}: operación inválida.`);
          continue;
        }

        checkedOperations++;

        const effectiveSecurity =
          operation.security !== undefined
            ? operation.security
            : specification.security;

        inspectRequirements(effectiveSecurity, location);
      }
    }

    if (findings.length > 0) {
      return {
        status: 'FAIL',
        message:
          `Se detectaron ${findings.length} inconsistencias de scopes OAuth2.`,
        evidence: JSON.stringify(findings),
        recommendation:
          'Declara los scopes solicitados en los flujos OAuth2 correspondientes o corrige los requisitos security de las operaciones.',
      };
    }

    if (unresolved.length > 0) {
      return {
        status: 'WARNING',
        message:
          'No fue posible verificar completamente los scopes OAuth2 de las rutas referenciadas.',
        evidence: JSON.stringify(unresolved),
        recommendation:
          'Resuelve los Path Items referenciados y vuelve a evaluar.',
      };
    }

    if (checkedRequirements === 0) {
      return {
        status: 'NOT_APPLICABLE',
        message:
          checkedOperations === 0
            ? 'No existen operaciones HTTP para evaluar.'
            : 'Las operaciones no utilizan requisitos OAuth2.',
      };
    }

    return {
      status: 'PASS',
      message:
        `Se verificaron ${checkedRequirements} requisitos OAuth2 sin inconsistencias de scopes.`,
    };
  }
}
