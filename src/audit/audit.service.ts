
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAll(page = 1, limit = 20) {
    const safePage = Math.max(1, Math.trunc(page));
    const safeLimit = Math.min(
      100,
      Math.max(1, Math.trunc(limit)),
    );

    const skip = (safePage - 1) * safeLimit;

    const [total, transitions, grouped] =
      await this.prisma.$transaction([
        this.prisma.workflowTransition.count(),

        this.prisma.workflowTransition.findMany({
          skip,
          take: safeLimit,

          orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' },
          ],

          select: {
            id: true,
            versionId: true,
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

            apiVersion: {
              select: {
                id: true,
                version: true,

                api: {
                  select: {
                    id: true,
                    name: true,
                    owner: true,
                  },
                },
              },
            },

            evaluationId: true,
            evaluatedDocumentId: true,
            evaluationScore: true,
            evaluatedRules: true,
            evaluationHasBlockingIssues: true,
          },
        }),

        this.prisma.workflowTransition.groupBy({
          by: ['toStatus'],
          _count: {
            _all: true,
          },
        }),
      ]);

    const countByStatus = (
      status: typeof grouped[number]['toStatus'],
    ): number =>
      grouped.find((item) => item.toStatus === status)
        ?._count._all ?? 0;

    const items = transitions.map((transition) => ({
      id: transition.id,

      api: {
        id: transition.apiVersion.api.id,
        name: transition.apiVersion.api.name,
        owner: transition.apiVersion.api.owner,
      },

      version: {
        id: transition.apiVersion.id,
        number: transition.apiVersion.version,
      },

      fromStatus: transition.fromStatus,
      toStatus: transition.toStatus,
      comment: transition.comment,
      createdAt: transition.createdAt,

      performedBy: transition.performedBy,

      approvalEvidence: transition.toStatus === 'APPROVED'
        ? {
            evaluationId: transition.evaluationId,
            documentId: transition.evaluatedDocumentId,
            qualityScore: transition.evaluationScore,
            evaluatedRules: transition.evaluatedRules,
            hasBlockingIssues:
              transition.evaluationHasBlockingIssues,
          }
        : null,
    }));

    return {
      summary: {
        total,
        approvals: countByStatus('APPROVED'),
        publications: countByStatus('PUBLISHED'),
        observations: countByStatus('OBSERVED'),
      },

      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },

      items,
    };
  }
}
