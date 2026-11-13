
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const CATEGORY_LABELS = {
    DESIGN: 'Diseño',
    DOCUMENTATION: 'Documentación',
    SECURITY: 'Seguridad',
    VERSIONING: 'Versionado',
    OBSERVABILITY: 'Observabilidad',
    GOVERNANCE: 'Gobierno',
} as const;

type Category = keyof typeof CATEGORY_LABELS;

@Injectable()
export class DashboardService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async getSummary() {
        const [
            totalApis,
            activeApis,
            totalEvaluations,
            completedEvaluations,
            versions,
            transitions,
        ] = await Promise.all([
            this.prisma.api.count(),

            this.prisma.api.count({
                where: { status: 'ACTIVE' },
            }),

            this.prisma.governanceExecution.count(),

            this.prisma.governanceExecution.count({
                where: { status: 'COMPLETED' },
            }),

            this.prisma.apiVersion.findMany({
                select: {
                    id: true,
                    version: true,
                    workflowStatus: true,

                    api: {
                        select: {
                            id: true,
                            name: true,
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

                                    results: {
                                        select: {
                                            category: true,
                                            severity: true,
                                            status: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }),

            this.prisma.workflowTransition.findMany({
                take: 6,
                orderBy: [
                    { createdAt: 'desc' },
                    { id: 'desc' },
                ],

                select: {
                    id: true,
                    toStatus: true,
                    createdAt: true,

                    performedBy: {
                        select: {
                            displayName: true,
                        },
                    },

                    apiVersion: {
                        select: {
                            version: true,
                            api: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
            }),
        ]);

        const pendingReviews = versions.filter(
            (version) =>
                version.workflowStatus === 'IN_REVIEW',
        ).length;

        const publishedVersions = versions.filter(
            (version) =>
                version.workflowStatus === 'PUBLISHED',
        ).length;

        const categoryStats: Record<
            Category,
            { passed: number; applicable: number }
        > = {
            DESIGN: { passed: 0, applicable: 0 },
            DOCUMENTATION: { passed: 0, applicable: 0 },
            SECURITY: { passed: 0, applicable: 0 },
            VERSIONING: { passed: 0, applicable: 0 },
            OBSERVABILITY: { passed: 0, applicable: 0 },
            GOVERNANCE: { passed: 0, applicable: 0 },
        };

        const scores: number[] = [];

        const attentionApis = versions.flatMap((version) => {
            const document = version.documents[0];
            const evaluation = document?.evaluations[0];

            const completed =
                evaluation?.status === 'COMPLETED';

            const results = completed
                ? evaluation.results
                : [];

            if (
                completed &&
                evaluation.qualityScore !== null &&
                Number.isFinite(evaluation.qualityScore)
            ) {
                scores.push(evaluation.qualityScore);
            }

            // Únicamente las evaluaciones vigentes
            // y completadas aportan a las categorías.
            for (const result of results) {
                if (!result.category) continue;

                if (result.status === 'NOT_APPLICABLE') {
                    continue;
                }

                const stats = categoryStats[result.category];
                stats.applicable += 1;

                if (result.status === 'PASS') {
                    stats.passed += 1;
                }
            }

            const findings = results.filter(
                (result) =>
                    result.status === 'FAIL' ||
                    result.status === 'WARNING',
            ).length;

            const blockingFindings = results.filter(
                (result) =>
                    result.status === 'FAIL' &&
                    (
                        result.severity === 'HIGH' ||
                        result.severity === 'CRITICAL'
                    ),
            ).length;

            const hasBlockingIssues =
                completed &&
                evaluation.hasBlockingIssues === true;

            const needsAttention =
                hasBlockingIssues ||
                [
                    'IN_REVIEW',
                    'OBSERVED',
                    'CORRECTED',
                    'APPROVED',
                ].includes(version.workflowStatus);

            if (!needsAttention) return [];


            const status: 'critical' | 'correction' | 'review' =
                hasBlockingIssues
                    ? 'critical'
                    : version.workflowStatus === 'OBSERVED' ||
                        version.workflowStatus === 'CORRECTED'
                        ? 'correction'
                        : 'review';


            return [{
                id: version.id,
                apiId: version.api.id,
                name: version.api.name,
                version: `v${version.version}`,
                score: completed
                    ? evaluation.qualityScore
                    : null,
                findings,
                criticalFindings: blockingFindings,
                status,
            }];
        });

        const averageScore = scores.length
            ? Number(
                (
                    scores.reduce((sum, score) => sum + score, 0) /
                    scores.length
                ).toFixed(2),
            )
            : null;

        const governanceCategories =
            Object.entries(categoryStats).map(
                ([category, stats]) => ({
                    id: category.toLowerCase(),
                    name: CATEGORY_LABELS[category as Category],
                    score: stats.applicable
                        ? Math.round(
                            (stats.passed / stats.applicable) * 100,
                        )
                        : null,
                    applicableRules: stats.applicable,
                }),
            );

        const recentActivity = transitions.map((transition) => ({
            id: transition.id,
            type: transition.toStatus === 'APPROVED' ||
                transition.toStatus === 'PUBLISHED'
                ? 'approval'
                : transition.toStatus === 'OBSERVED'
                    ? 'finding'
                    : 'evaluation',

            title: `Versión ${transition.toStatus === 'PUBLISHED'
                ? 'publicada'
                : transition.toStatus === 'APPROVED'
                    ? 'aprobada'
                    : transition.toStatus === 'OBSERVED'
                        ? 'observada'
                        : 'actualizada'
                }`,

            description:
                `${transition.apiVersion.api.name} ` +
                `v${transition.apiVersion.version} · ` +
                transition.performedBy.displayName,

            time: transition.createdAt.toISOString(),
        }));

        return {
            metrics: {
                totalApis,
                activeApis,
                totalEvaluations,
                completedEvaluations,
                pendingReviews,
                publishedVersions,
                averageScore,
                scoredVersions: scores.length,
            },


            attentionApis: attentionApis
                .sort((a, b) => {
                    const rank: Record<
                        'critical' | 'correction' | 'review',
                        number
                    > = {
                        critical: 0,
                        correction: 1,
                        review: 2,
                    };

                    return rank[a.status] - rank[b.status];
                })
                .slice(0, 5),


            governanceCategories,
            recentActivity,
        };
    }
}
