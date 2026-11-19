import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, WorkflowStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Los revisores reciben nuevas solicitudes del buzón compartido.
   * Los desarrolladores solo reciben novedades vinculadas a APIs
   * de las que son responsables o en las que cargaron documentos.
   * Los administradores conservan la visibilidad global.
   */
  private visibleTransitions(user: AuthenticatedUser): Prisma.WorkflowTransitionWhereInput {
    const statuses: WorkflowStatus[] = [
      'IN_REVIEW', 'OBSERVED', 'CORRECTED', 'APPROVED', 'PUBLISHED',
    ];
    if (user.roles.includes('ADMIN')) {
      return { toStatus: { in: statuses } };
    }

    const scopes: Prisma.WorkflowTransitionWhereInput[] = [];

    if (user.roles.includes('REVIEWER')) {
      scopes.push({ toStatus: { in: ['IN_REVIEW', 'CORRECTED'] } });
    }

    if (user.roles.includes('DEVELOPER')) {
      scopes.push({
        toStatus: { in: ['OBSERVED', 'APPROVED'] },
        apiVersion: {
          OR: [
            { api: { owner: { equals: user.email, mode: 'insensitive' } } },
            { api: { owner: { equals: user.displayName, mode: 'insensitive' } } },
            { documents: { some: { uploadedBy: user.id } } },
          ],
        },
      });
    }

    return scopes.length ? { OR: scopes } : { id: '__no_notifications__' };
  }

  async list(user: AuthenticatedUser) {
    const rows = await this.prisma.workflowTransition.findMany({
      where: this.visibleTransitions(user),
      take: 40,
      orderBy: { createdAt: 'desc' },
      include: {
        apiVersion: { include: { api: { select: { id: true, name: true } } } },
        notificationReads: { where: { userId: user.id }, select: { id: true } },
      },
    });

    const items = rows.map((row) => ({
      id: row.id,
      title: `${row.apiVersion.api.name} · ${row.toStatus}`,
      message: `Versión ${row.apiVersion.version} pasó de ${row.fromStatus} a ${row.toStatus}`,
      createdAt: row.createdAt,
      read: row.notificationReads.length > 0,
      url: `/app/apis/${encodeURIComponent(row.apiVersion.api.id)}`,
    }));

    return { unread: items.filter((item) => !item.read).length, items };
  }

  async markRead(user: AuthenticatedUser, transitionId: string) {
    const transition = await this.prisma.workflowTransition.findFirst({
      where: { id: transitionId, ...this.visibleTransitions(user) },
      select: { id: true },
    });
    if (!transition) throw new NotFoundException('Notificación no encontrada.');
    await this.prisma.notificationRead.upsert({
      where: { userId_transitionId: { userId: user.id, transitionId } },
      update: {},
      create: { userId: user.id, transitionId },
    });
    return { id: transitionId, read: true };
  }
}
