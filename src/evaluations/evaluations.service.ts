
import {
    Injectable,
    NotFoundException,
    ConflictException,
    InternalServerErrorException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import { parseDocument } from 'yaml';

import {
    GovernanceRuleEngineService,
} from '../governance/governance-rule-engine.service.js';

import {
    isOpenApiObject,
} from '../governance/utils/resolve-local-ref.js';


import {
    getGovernanceRules,
} from '../governance/catalog/governance-rules.catalog.js';

import {
    calculateQualityScore,
} from '../governance/scoring/quality-score.calculator.js';

import type {
    GovernanceRuleResult,
} from '../governance/interfaces/governance-result.interface.js';

const EXPECTED_MVP_RULES = 18;


@Injectable()
export class EvaluationsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly engine: GovernanceRuleEngineService,
    ) { }

    async create(documentId: string) {
        const document =
            await this.prisma.openApiDocument.findUnique({
                where: { id: documentId },
                select: { id: true },
            });

        if (!document) {
            throw new NotFoundException(
                'El documento OpenAPI solicitado no existe.',
            );
        }

        return this.prisma.governanceExecution.create({
            data: {
                documentId,
                executedBy: 'system-local',
                status: 'PENDING',
            },
        });
    }


    async execute(id: string) {
        const execution =
            await this.prisma.governanceExecution.findUnique({
                where: { id },
                include: {
                    document: {
                        select: {
                            content: true,
                            format: true,
                        },
                    },
                },
            });

        if (!execution) {
            throw new NotFoundException(
                'La evaluación solicitada no existe.',
            );
        }

        if (execution.status !== 'PENDING') {
            throw new ConflictException(
                'Solo se pueden ejecutar evaluaciones pendientes.',
            );
        }

        // Evita que dos solicitudes ejecuten simultáneamente
        // la misma evaluación.
        const claimed = await this.prisma.governanceExecution
            .updateMany({
                where: {
                    id,
                    status: 'PENDING',
                },
                data: {
                    status: 'RUNNING',
                    startedAt: new Date(),
                    errorMessage: null,
                },
            });

        if (claimed.count !== 1) {
            throw new ConflictException(
                'Esta evaluación ya fue tomada por otra ejecución.',
            );
        }

        try {
            let specification: unknown;

            if (execution.document.format === 'JSON') {
                specification = JSON.parse(
                    execution.document.content,
                ) as unknown;
            } else {
                const yamlDocument = parseDocument(
                    execution.document.content,
                    { uniqueKeys: true },
                );

                if (yamlDocument.errors.length > 0) {
                    throw new Error(
                        'El documento YAML contiene errores de sintaxis.',
                    );
                }

                specification = yamlDocument.toJS({
                    maxAliasCount: 100,
                }) as unknown;
            }

            if (!isOpenApiObject(specification)) {
                throw new Error(
                    'El documento OpenAPI debe contener un objeto raíz.',
                );
            }

            const result = this.engine.execute(specification);

            // La persistencia de los resultados y el cierre
            // de la evaluación deben ocurrir atómicamente.
            await this.prisma.$transaction(async (tx) => {

                await tx.ruleResult.createMany({
                    data: result.results.map((rule) => ({
                        executionId: id,

                        // Identificación y metadatos históricos
                        ruleId: rule.ruleId,
                        ruleName: rule.ruleName,
                        category: rule.category,
                        severity: rule.severity,
                        weight: rule.weight,

                        // Resultado de la evaluación
                        status: rule.status,
                        message: rule.message,
                        evidence: rule.evidence ?? null,
                        recommendation: rule.recommendation ?? null,
                    })),
                });


                await tx.governanceExecution.update({
                    where: { id },
                    data: {
                        status: 'COMPLETED',
                        completedAt: new Date(),
                        totalRules: result.totalRules,
                        passedRules: result.passedRules,
                        failedRules: result.failedRules,
                        warningRules: result.warningRules,
                        notApplicableRules:
                            result.notApplicableRules,

                        // Estos datos se calcularán cuando
                        // implementemos la política de puntuación.
                        qualityScore: null,
                        hasBlockingIssues: null,
                    },
                });
            });

            return this.findOne(id);
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : 'Error técnico desconocido.';

            await this.prisma.governanceExecution.update({
                where: { id },
                data: {
                    status: 'FAILED',
                    completedAt: new Date(),
                    errorMessage: errorMessage.slice(0, 2000),
                },
            });

            throw new InternalServerErrorException(
                'No fue posible completar la evaluación. ' +
                'Consulta su estado para revisar el error.',
            );
        }
    }


    async findAll() {
        return this.prisma.governanceExecution.findMany({
            orderBy: {
                requestedAt: 'desc',
            },
            include: {
                document: {
                    select: {
                        id: true,
                        fileName: true,
                        format: true,
                        openApiVersion: true,
                        apiVersion: {
                            select: {
                                id: true,
                                version: true,
                                api: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
    }

    async findByDocument(documentId: string) {
        const document =
            await this.prisma.openApiDocument.findUnique({
                where: { id: documentId },
                select: { id: true },
            });

        if (!document) {
            throw new NotFoundException(
                'El documento OpenAPI solicitado no existe.',
            );
        }

        return this.prisma.governanceExecution.findMany({
            where: { documentId },
            orderBy: {
                requestedAt: 'desc',
            },
        });
    }

    async findOne(id: string) {
        const execution =
            await this.prisma.governanceExecution.findUnique({
                where: { id },
                include: {
                    results: {
                        orderBy: {
                            ruleId: 'asc',
                        },
                    },
                    document: {
                        select: {
                            id: true,
                            fileName: true,
                            format: true,
                            openApiVersion: true,
                            apiVersion: {
                                select: {
                                    id: true,
                                    version: true,
                                    api: {
                                        select: {
                                            id: true,
                                            name: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

        if (!execution) {
            throw new NotFoundException(
                'La evaluación solicitada no existe.',
            );
        }



        let scoreAssessment = null;

        if (execution.status === 'COMPLETED') {
            const results = execution.results;

            const hasCompleteMetadata =
                results.length > 0 &&
                results.every(
                    (result) =>
                        result.ruleName !== null &&
                        result.category !== null &&
                        result.severity !== null &&
                        result.weight !== null &&
                        Number.isFinite(result.weight) &&
                        result.weight > 0,
                );

            if (hasCompleteMetadata) {
                const historicalResults: GovernanceRuleResult[] =
                    results.map((result) => ({
                        ruleId: result.ruleId,
                        ruleName: result.ruleName!,
                        category: result.category!,
                        severity: result.severity!,
                        weight: result.weight!,
                        status: result.status,
                        message: result.message,
                        evidence: result.evidence ?? undefined,
                        recommendation:
                            result.recommendation ?? undefined,
                    }));

                const calculation =
                    calculateQualityScore(historicalResults);

                const executedRules = results.length;

                scoreAssessment = {
                    score: calculation.score,
                    executedRules,
                    expectedRules: EXPECTED_MVP_RULES,
                    applicableRules: calculation.applicableRules,
                    excludedRules: calculation.excludedRules,
                    coveragePercentage: Math.round(
                        (executedRules / EXPECTED_MVP_RULES) * 10000,
                    ) / 100,
                    isProvisional: true,
                    criticalFailuresDetectedInExecutedRules:
                        calculation.hasCriticalFailures,
                };
            }
        }

        return {
            ...execution,
            scoreAssessment,
        };


    }
}
