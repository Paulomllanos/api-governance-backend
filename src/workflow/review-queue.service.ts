
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ReviewQueueService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async findAll() {
        const versions = await this.prisma.apiVersion.findMany({
            where: {
                workflowStatus: {
                    in: [
                        'IN_REVIEW',
                        'OBSERVED',
                        'CORRECTED',
                        'APPROVED',
                    ],
                },
            },

            orderBy: [
                { updatedAt: 'desc' },
                { id: 'desc' },
            ],

            select: {
                id: true,
                apiId: true,
                version: true,
                description: true,
                status: true,
                workflowStatus: true,
                updatedAt: true,

                api: {
                    select: {
                        id: true,
                        name: true,
                        owner: true,
                    },
                },

                documents: {
                    orderBy: [
                        { createdAt: 'desc' },
                        { id: 'desc' },
                    ],
                    take: 1,

                    select: {
                        id: true,
                        fileName: true,
                        isValid: true,

                        evaluations: {
                            orderBy: [
                                { requestedAt: 'desc' },
                                { id: 'desc' },
                            ],
                            take: 1,

                            select: {
                                id: true,
                                status: true,
                                qualityScore: true,
                                hasBlockingIssues: true,
                                totalRules: true,

                                _count: {
                                    select: {
                                        results: true,
                                    },
                                },

                                results: {
                                    where: {
                                        status: 'FAIL',
                                        severity: {
                                            in: ['HIGH', 'CRITICAL'],
                                        },
                                    },
                                    select: {
                                        id: true,
                                        ruleId: true,
                                        ruleName: true,
                                        severity: true,
                                        message: true,
                                        recommendation: true,
                                    },
                                },

                            },
                        },
                    },
                },
            },
        });

        const items = versions.map((version) => {
            const document = version.documents[0];
            const evaluation = document?.evaluations[0];


            const approvalBlockers: string[] = [];

            if (!document) {
                approvalBlockers.push(
                    'La versión no tiene un documento OpenAPI.',
                );
            } else if (!document.isValid) {
                approvalBlockers.push(
                    'El documento OpenAPI vigente no es válido.',
                );
            }

            if (document && !evaluation) {
                approvalBlockers.push(
                    'El documento vigente no tiene evaluaciones.',
                );
            }

            if (evaluation) {
                if (evaluation.status !== 'COMPLETED') {
                    approvalBlockers.push(
                        'La última evaluación no está completada.',
                    );
                } else {
                    if (
                        evaluation.totalRules !== 18 ||
                        evaluation._count.results !== 18
                    ) {
                        approvalBlockers.push(
                            'La evaluación no tiene cobertura completa de las 18 reglas.',
                        );
                    }

                    if (
                        evaluation.qualityScore === null ||
                        !Number.isFinite(evaluation.qualityScore)
                    ) {
                        approvalBlockers.push(
                            'La evaluación no tiene un Quality Score válido.',
                        );
                    }

                    if (evaluation.hasBlockingIssues !== false) {
                        approvalBlockers.push(
                            'La evaluación presenta hallazgos bloqueantes o un resultado no concluyente.',
                        );
                    }
                }
            }


            const evaluationReady =
                document?.isValid === true &&
                evaluation?.status === 'COMPLETED' &&
                evaluation.totalRules === 18 &&
                evaluation._count.results === 18 &&
                evaluation.qualityScore !== null &&
                evaluation.qualityScore !== undefined &&
                Number.isFinite(evaluation.qualityScore) &&
                evaluation.hasBlockingIssues === false;

            return {
                id: version.id,
                apiId: version.apiId,
                version: version.version,
                description: version.description,
                lifecycleStatus: version.status,
                workflowStatus: version.workflowStatus,
                updatedAt: version.updatedAt,

                api: version.api,
                approvalBlockers,

                document: document
                    ? {
                        id: document.id,
                        fileName: document.fileName,
                        isValid: document.isValid,
                    }
                    : null,

                evaluation: evaluation
                    ? {
                        id: evaluation.id,
                        status: evaluation.status,
                        qualityScore: evaluation.qualityScore,
                        hasBlockingIssues:
                            evaluation.hasBlockingIssues,
                        totalRules: evaluation.totalRules,
                        resultsCount: evaluation._count.results,

                        blockingRules: evaluation.results.map((result) => ({
                            id: result.id,
                            ruleId: result.ruleId,
                            ruleName: result.ruleName,
                            severity: result.severity,
                            message: result.message,
                            recommendation: result.recommendation,
                        })),

                    }
                    : null,

                evaluationReady,
            };
        });

        return {
            summary: {
                total: items.length,

                inReview: items.filter(
                    (item) => item.workflowStatus === 'IN_REVIEW',
                ).length,

                observed: items.filter(
                    (item) => item.workflowStatus === 'OBSERVED',
                ).length,

                corrected: items.filter(
                    (item) => item.workflowStatus === 'CORRECTED',
                ).length,

                approved: items.filter(
                    (item) => item.workflowStatus === 'APPROVED',
                ).length,
            },

            items,
        };
    }
}
