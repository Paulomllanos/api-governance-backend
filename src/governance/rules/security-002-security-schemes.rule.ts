
import type {
    GovernanceRule,
    GovernanceRuleEvaluation,
    OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import {
    isOpenApiObject,
} from '../utils/resolve-local-ref.js';

const HTTP_METHODS = [
    'get', 'post', 'put', 'patch',
    'delete', 'head', 'options', 'trace',
] as const;

const OAUTH_FLOWS = [
    'implicit',
    'password',
    'clientCredentials',
    'authorizationCode',
] as const;

function nonEmpty(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function validUrl(value: unknown): boolean {
    if (!nonEmpty(value)) return false;

    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function validateScheme(
    name: string,
    scheme: unknown,
): string[] {
    const issues: string[] = [];

    if (!isOpenApiObject(scheme)) {
        return [`${name}: definición inválida.`];
    }

    switch (scheme.type) {
        case 'http':
            if (!nonEmpty(scheme.scheme)) {
                issues.push(`${name}: falta scheme HTTP.`);
            }
            break;

        case 'apiKey':
            if (!nonEmpty(scheme.name)) {
                issues.push(`${name}: falta name.`);
            }

            if (
                scheme.in !== 'header' &&
                scheme.in !== 'query' &&
                scheme.in !== 'cookie'
            ) {
                issues.push(`${name}: ubicación in inválida.`);
            }
            break;

        case 'oauth2': {
            if (!isOpenApiObject(scheme.flows)) {
                issues.push(`${name}: falta flows válido.`);
                break;
            }

            //   const declaredFlows = OAUTH_FLOWS.filter(
            //     (flow) => scheme.flows &&
            //       isOpenApiObject(scheme.flows) &&
            //       scheme.flows[flow] !== undefined,
            //   );
            const flows = scheme.flows;
            const declaredFlows = OAUTH_FLOWS.filter(
                (flowName) => flows[flowName] !== undefined,
            );

            if (declaredFlows.length === 0) {
                issues.push(`${name}: no declara flujos OAuth2.`);
            }

            for (const flowName of declaredFlows) {
                const flow = scheme.flows[flowName];

                if (!isOpenApiObject(flow)) {
                    issues.push(`${name}.${flowName}: flujo inválido.`);
                    continue;
                }

                if (
                    (flowName === 'implicit' ||
                        flowName === 'authorizationCode') &&
                    !validUrl(flow.authorizationUrl)
                ) {
                    issues.push(
                        `${name}.${flowName}: authorizationUrl inválida.`,
                    );
                }

                if (
                    (flowName === 'password' ||
                        flowName === 'clientCredentials' ||
                        flowName === 'authorizationCode') &&
                    !validUrl(flow.tokenUrl)
                ) {
                    issues.push(
                        `${name}.${flowName}: tokenUrl inválida.`,
                    );
                }

                if (!isOpenApiObject(flow.scopes)) {
                    issues.push(
                        `${name}.${flowName}: falta scopes válido.`,
                    );
                }
            }
            break;
        }

        case 'openIdConnect':
            if (!validUrl(scheme.openIdConnectUrl)) {
                issues.push(
                    `${name}: openIdConnectUrl inválida.`,
                );
            }
            break;

        case 'mutualTLS':
            // Tipo admitido por OpenAPI 3.1.
            // La versión del contrato se valida en la ingesta.
            break;

        default:
            issues.push(`${name}: tipo de seguridad desconocido.`);
    }

    return issues;
}

export class Security002SecuritySchemesRule
    implements GovernanceRule {
    readonly id = 'SECURITY-002';
    readonly name = 'Definición de mecanismos de autenticación';
    readonly description =
        'Los mecanismos de seguridad deben estar correctamente declarados y referenciados.';
    readonly category = 'SECURITY' as const;
    readonly severity = 'HIGH' as const;
    readonly weight = 1;

    evaluate(
        specification: OpenApiSpecification,
    ): GovernanceRuleEvaluation {
        const findings: string[] = [];
        const unresolved: string[] = [];

        const components = specification.components;
        const schemes =
            isOpenApiObject(components) &&
                isOpenApiObject(components.securitySchemes)
                ? components.securitySchemes
                : {};

        const declaredSchemes = Object.entries(schemes);

        for (const [name, scheme] of declaredSchemes) {
            findings.push(...validateScheme(name, scheme));
        }

        let requirementCount = 0;

        const inspectRequirements = (
            security: unknown,
            location: string,
        ) => {
            if (security === undefined) return;

            if (!Array.isArray(security)) {
                findings.push(`${location}: security inválido.`);
                return;
            }

            for (const requirement of security) {
                if (!isOpenApiObject(requirement)) {
                    findings.push(
                        `${location}: requisito de seguridad inválido.`,
                    );
                    continue;
                }

                for (const [name, scopes] of Object.entries(requirement)) {
                    requirementCount++;

                    if (!(name in schemes)) {
                        findings.push(
                            `${location}: el mecanismo ${name} no está definido.`,
                        );
                        continue;
                    }

                    if (!Array.isArray(scopes)) {
                        findings.push(
                            `${location}: scopes de ${name} inválidos.`,
                        );
                        continue;
                    }

                    const scheme = schemes[name];

                    if (
                        isOpenApiObject(scheme) &&
                        scheme.type !== 'oauth2' &&
                        scheme.type !== 'openIdConnect' &&
                        scopes.length > 0
                    ) {
                        findings.push(
                            `${location}: ${name} no admite scopes OAuth.`,
                        );
                    }
                }
            }
        };

        inspectRequirements(
            specification.security,
            'GLOBAL',
        );

        if (isOpenApiObject(specification.paths)) {
            for (const [path, pathItem] of Object.entries(
                specification.paths,
            )) {
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

                    if (operation === undefined) continue;

                    const location = `${method.toUpperCase()} ${path}`;

                    if (!isOpenApiObject(operation)) {
                        findings.push(`${location}: operación inválida.`);
                        continue;
                    }

                    inspectRequirements(
                        operation.security,
                        location,
                    );
                }
            }
        }

        if (findings.length > 0) {
            return {
                status: 'FAIL',
                message:
                    `Se detectaron ${findings.length} problemas en los mecanismos de seguridad.`,
                evidence: JSON.stringify(findings),
                recommendation:
                    'Corrige components.securitySchemes y verifica que los requisitos security hagan referencia a mecanismos existentes y válidos.',
            };
        }

        if (unresolved.length > 0) {
            return {
                status: 'WARNING',
                message:
                    'No se pudieron verificar todas las rutas referenciadas.',
                evidence: JSON.stringify(unresolved),
                recommendation:
                    'Resuelve los Path Items referenciados antes de completar la revisión.',
            };
        }

        if (
            declaredSchemes.length === 0 &&
            requirementCount === 0
        ) {
            return {
                status: 'NOT_APPLICABLE',
                message:
                    'No hay mecanismos de seguridad declarados para validar.',
            };
        }

        return {
            status: 'PASS',
            message:
                `Se verificaron ${declaredSchemes.length} mecanismos de seguridad.`,
        };
    }
}
