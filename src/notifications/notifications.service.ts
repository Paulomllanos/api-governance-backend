import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import type { WorkflowStatus } from '@prisma/client';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private statuses(user: AuthenticatedUser): WorkflowStatus[] {
    if (user.roles.includes('ADMIN')) return ['IN_REVIEW', 'OBSERVED', 'CORRECTED', 'APPROVED', 'PUBLISHED'];
    const statuses: WorkflowStatus[] = [];
    if (user.roles.includes('REVIEWER')) statuses.push('IN_REVIEW', 'CORRECTED');
    if (user.roles.includes('DEVELOPER')) statuses.push('OBSERVED', 'APPROVED');
    return statuses;
  }

  async list(user: AuthenticatedUser) {
    const statuses = this.statuses(user);
    if (!statuses.length) return { unread: 0, items: [] };
    const rows = await this.prisma.workflowTransition.findMany({
      where: { toStatus: { in: statuses } }, take: 40, orderBy: { createdAt: 'desc' },
      include: { apiVersion: { include: { api: { select: { id: true, name: true } } } }, notificationReads: { where: { userId: user.id }, select: { id: true } } },
    });
    const items = rows.map(row => ({
      id: row.id, title: `${row.apiVersion.api.name} · ${row.toStatus}`,
      message: `Versión ${row.apiVersion.version} pasó de ${row.fromStatus} a ${row.toStatus}`,
      createdAt: row.createdAt, read: row.notificationReads.length > 0,
      url: `/app/apis/${encodeURIComponent(row.apiVersion.api.id)}`,
    }));
    return { unread: items.filter(item => !item.read).length, items };
  }

  async markRead(user: AuthenticatedUser, transitionId: string) {
    const transition = await this.prisma.workflowTransition.findFirst({
      where: { id: transitionId, toStatus: { in: this.statuses(user) } }, select: { id: true },
    });
    if (!transition) throw new NotFoundException('Notificación no encontrada.');
    await this.prisma.notificationRead.upsert({
      where: { userId_transitionId: { userId: user.id, transitionId } },
      update: {}, create: { userId: user.id, transitionId },
    });
    return { id: transitionId, read: true };
  }
}
