
import type {
    GovernanceRule,
    GovernanceRuleEvaluation,
    OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import type {
    GovernanceEvaluationContext,
} from '../interfaces/governance-evaluation-context.interface.js';

import {
    isOpenApiObject,
} from '../utils/resolve-local-ref.js';

export class Versioning001VersionConsistencyRule
    implements GovernanceRule {
    readonly id = 'VERSIONING-001';

    readonly name = 'Consistencia de versión de API';

    readonly description =
        'info.version debe coincidir con la versión registrada en la plataforma.';

    readonly category = 'VERSIONING' as const;

    readonly severity = 'MEDIUM' as const;

    readonly weight = 1;

    evaluate(
        specification: OpenApiSpecification,
        context?: GovernanceEvaluationContext,
    ): GovernanceRuleEvaluation {

        const info = specification.info;

        const documentVersion = isOpenApiObject(info)
            ? info.version
            : undefined;


        if (
            typeof documentVersion !== 'string' ||
            documentVersion.trim().length === 0
        ) {
            return {
                status: 'FAIL',
                message:
                    'El documento OpenAPI no contiene una versión válida en info.version.',
                evidence: 'info.version',
                recommendation:
                    'Declara la versión del contrato en info.version.',
            };
        }

        const registeredVersion = context?.registeredApiVersion;

        if (
            typeof registeredVersion !== 'string' ||
            registeredVersion.trim().length === 0
        ) {
            return {
                status: 'WARNING',
                message:
                    'No se recibió la versión registrada de la API para comparar.',
                evidence: JSON.stringify({
                    documentVersion,
                    registeredVersion: null,
                }),
                recommendation:
                    'Ejecuta la evaluación incluyendo la versión registrada de la API.',
            };
        }

        if (documentVersion !== registeredVersion) {
            return {
                status: 'FAIL',
                message:
                    'La versión del documento OpenAPI no coincide con la versión registrada.',
                evidence: JSON.stringify({
                    documentVersion,
                    registeredVersion,
                }),
                recommendation:
                    'Actualiza info.version o selecciona la versión correspondiente en la plataforma.',
            };
        }

        return {
            status: 'PASS',
            message:
                `La versión ${documentVersion} coincide con la registrada en la plataforma.`,
            evidence: JSON.stringify({
                documentVersion,
                registeredVersion,
            }),
        };
    }
}
