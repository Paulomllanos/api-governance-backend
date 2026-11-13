
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';


import {
  BadRequestException,
} from '@nestjs/common';

import {
  Prisma,
  WorkflowStatus,
} from '@prisma/client';

export interface AuditFilters {
  search?: string;
  api?: string;
  user?: string;
  status?: string;
  from?: string;
  to?: string;
}

function parseAuditDate(
  value: string | undefined,
  field: string,
): Date | undefined {
  if (!value) return undefined;

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException(
      `El campo ${field} debe contener una fecha válida YYYY-MM-DD.`,
    );
  }

  return date;
}


@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async findAll(page = 1, limit = 20, filters: AuditFilters = {}) {
    const safePage = Math.max(1, Math.trunc(page));
    const safeLimit = Math.min(
      100,
      Math.max(1, Math.trunc(limit)),
    );

    const skip = (safePage - 1) * safeLimit;

    const search = filters.search?.trim();
    const api = filters.api?.trim();
    const user = filters.user?.trim();

    const fromDate = parseAuditDate(filters.from, 'from');
    const toDate = parseAuditDate(filters.to, 'to');

    if (
      filters.status &&
      !Object.values(WorkflowStatus).includes(
        filters.status as WorkflowStatus,
      )
    ) {
      throw new BadRequestException(
        'El estado de transición no es válido.',
      );
    }

    if (
      fromDate &&
      toDate &&
      fromDate.getTime() > toDate.getTime()
    ) {
      throw new BadRequestException(
        'La fecha inicial no puede superar la fecha final.',
      );
    }

    // El límite superior es exclusivo: incluye todo el día "to".
    const toExclusive = toDate
      ? new Date(toDate.getTime() + 24 * 60 * 60 * 1000)
      : undefined;

    const where: Prisma.WorkflowTransitionWhereInput = {
      ...(filters.status
        ? { toStatus: filters.status as WorkflowStatus }
        : {}),

      ...(fromDate || toExclusive
        ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toExclusive ? { lt: toExclusive } : {}),
          },
        }
        : {}),

      ...(api
        ? {
          apiVersion: {
            api: {
              name: {
                contains: api,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          },
        }
        : {}),

      ...(user
        ? {
          performedBy: {
            OR: [
              {
                displayName: {
                  contains: user,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
              {
                email: {
                  contains: user,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            ],
          },
        }
        : {}),

      ...(search
        ? {
          OR: [
            {
              comment: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              apiVersion: {
                api: {
                  name: {
                    contains: search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              },
            },
            {
              performedBy: {
                displayName: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
            {
              performedBy: {
                email: {
                  contains: search,
                  mode: Prisma.QueryMode.insensitive,
                },
              },
            },
          ],
        }
        : {}),
    };

    const [total, transitions, grouped] =
      await this.prisma.$transaction([
        this.prisma.workflowTransition.count({ where }),

        this.prisma.workflowTransition.findMany({
          where,
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
          where,
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
