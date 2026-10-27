
import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import {
    Prisma,
    WorkflowStatus,
} from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service.js';

import {
    validateWorkflowTransition,
} from './policies/workflow-transition.policy.js';

import type {
    AuthenticatedUser,
} from '../auth/interfaces/authenticated-user.interface.js';

const EXPECTED_RULES = 18;


interface ApprovalEvidence {
    evaluationId: string;
    documentId: string;
    qualityScore: number;
    totalRules: number;
    hasBlockingIssues: false;
}


interface ChangeWorkflowStatusInput {
    apiId: string;
    versionId: string;
    toStatus: WorkflowStatus;
    comment?: string;
    actor: AuthenticatedUser;
}

@Injectable()
export class WorkflowService {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async changeStatus(input: ChangeWorkflowStatusInput) {
        const comment = input.comment?.trim() || null;

        try {
            return await this.prisma.$transaction(
                async (tx) => {

                    const lockedVersions =
                        await tx.$queryRaw<{ id: string }[]>`
                            SELECT id
                            FROM "api_versions"
                            WHERE id = ${input.versionId}
                            AND "apiId" = ${input.apiId}
                            FOR UPDATE
                        `;

                    if (lockedVersions.length === 0) {
                        throw new NotFoundException(
                            'La versión solicitada no existe.',
                        );
                    }



                    const version = await tx.apiVersion.findFirst({
                        where: {
                            id: input.versionId,
                            apiId: input.apiId,
                        },
                        select: {
                            id: true,
                            workflowStatus: true,
                        },
                    });



                    if (!version) {
                        throw new NotFoundException(
                            'La versión solicitada no existe.',
                        );
                    }

                    const rule = validateWorkflowTransition({
                        from: version.workflowStatus,
                        to: input.toStatus,
                        roles: input.actor.roles,
                        comment,
                    });

                    // El actor debe existir y continuar activo.
                    const actor = await tx.user.findUnique({
                        where: {
                            id: input.actor.id,
                        },
                        select: {
                            id: true,
                            isActive: true,
                        },
                    });

                    if (!actor?.isActive) {
                        throw new ConflictException(
                            'El usuario no está activo.',
                        );
                    }


                    const approvalEvidence =
                        rule.requiresApprovedEvaluation
                            ? await this.validateEvaluation(tx, version.id)
                            : null;



                    const updated = await tx.apiVersion.updateMany({
                        where: {
                            id: version.id,
                            apiId: input.apiId,
                            workflowStatus: version.workflowStatus,
                        },
                        data: {
                            workflowStatus: input.toStatus,

                            ...(input.toStatus === 'PUBLISHED'
                                ? {
                                    status: 'ACTIVE',
                                }
                                : {}),
                        },
                    });


                    if (updated.count !== 1) {
                        throw new ConflictException(
                            'La versión cambió de estado durante la operación.',
                        );
                    }


                    const transition =
                        await tx.workflowTransition.create({
                            data: {
                                versionId: version.id,
                                performedById: input.actor.id,
                                fromStatus: version.workflowStatus,
                                toStatus: input.toStatus,
                                comment,

                                // Evidencia asociada exclusivamente
                                // a la transición de aprobación.
                                ...(approvalEvidence
                                    ? {
                                        evaluationId:
                                            approvalEvidence.evaluationId,

                                        evaluatedDocumentId:
                                            approvalEvidence.documentId,

                                        evaluationScore:
                                            approvalEvidence.qualityScore,

                                        evaluatedRules:
                                            approvalEvidence.totalRules,

                                        evaluationHasBlockingIssues:
                                            approvalEvidence.hasBlockingIssues,
                                    }
                                    : {}),
                            },
                        });


                    return {
                        versionId: version.id,
                        previousStatus: version.workflowStatus,
                        currentStatus: input.toStatus,
                        transition,
                    };
                },
                {
                    isolationLevel:
                        Prisma.TransactionIsolationLevel.Serializable,
                },
            );
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2034'
            ) {
                throw new ConflictException(
                    'Se detectó una operación concurrente. Intenta nuevamente.',
                );
            }

            throw error;
        }
    }

    private async validateEvaluation(
        tx: Prisma.TransactionClient,
        versionId: string,
    ): Promise<ApprovalEvidence> {
        // Seleccionar el documento más reciente.
        const document = await tx.openApiDocument.findFirst({
            where: {
                versionId,
            },
            orderBy: [
                { createdAt: 'desc' },
                { id: 'desc' },
            ],
            select: {
                id: true,
                isValid: true,
            },
        });

        if (!document || !document.isValid) {
            throw new ConflictException(
                'La versión necesita un documento OpenAPI válido.',
            );
        }

        // Revisar la última evaluación de ese documento.
        const evaluation =
            await tx.governanceExecution.findFirst({
                where: {
                    documentId: document.id,
                },
                orderBy: [
                    { requestedAt: 'desc' },
                    { id: 'desc' },
                ],
                select: {
                    id: true,
                    status: true,
                    totalRules: true,
                    qualityScore: true,
                    hasBlockingIssues: true,
                    _count: {
                        select: {
                            results: true,
                        },
                    },
                },
            });

        if (
            !evaluation ||
            evaluation.status !== 'COMPLETED'
        ) {
            throw new ConflictException(
                'El documento vigente necesita una evaluación completada.',
            );
        }

        if (
            evaluation.totalRules !== EXPECTED_RULES ||
            evaluation._count.results !== EXPECTED_RULES
        ) {
            throw new ConflictException(
                'La evaluación no tiene cobertura completa de las 18 reglas.',
            );
        }

        if (
            evaluation.qualityScore === null ||
            !Number.isFinite(evaluation.qualityScore)
        ) {
            throw new ConflictException(
                'La evaluación no contiene un Quality Score válido.',
            );
        }

        if (evaluation.hasBlockingIssues !== false) {
            throw new ConflictException(
                'La versión contiene hallazgos bloqueantes o no tiene una verificación concluyente.',
            );
        }


        return {
            evaluationId: evaluation.id,
            documentId: document.id,
            qualityScore: evaluation.qualityScore,
            totalRules: evaluation.totalRules,
            hasBlockingIssues: false,
        };

    }


    async findHistory(
        apiId: string,
        versionId: string,
    ) {
        const version = await this.prisma.apiVersion.findFirst({
            where: {
                id: versionId,
                apiId,
            },
            select: {
                id: true,
                version: true,
                workflowStatus: true,
            },
        });

        if (!version) {
            throw new NotFoundException(
                'La versión solicitada no existe para esta API.',
            );
        }

        const transitions =
            await this.prisma.workflowTransition.findMany({
                where: {
                    versionId,
                },
                orderBy: [
                    { createdAt: 'asc' },
                    { id: 'asc' },
                ],
                select: {
                    id: true,
                    fromStatus: true,
                    toStatus: true,
                    comment: true,
                    createdAt: true,
                    performedBy: {
                        select: {
                            id: true,
                            displayName: true,
                            email: true,
                        },
                    },

                    evaluationId: true,
                    evaluatedDocumentId: true,
                    evaluationScore: true,
                    evaluatedRules: true,
                    evaluationHasBlockingIssues: true,

                },
            });

        return {
            versionId: version.id,
            version: version.version,
            currentStatus: version.workflowStatus,
            totalTransitions: transitions.length,
            transitions,
        };
    }

}
