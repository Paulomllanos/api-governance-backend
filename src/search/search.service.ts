import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async run(raw: string) {
    const q = raw.trim();
    if (q.length < 2 || q.length > 100) throw new BadRequestException('La búsqueda requiere entre 2 y 100 caracteres.');
    const contains = { contains: q, mode: 'insensitive' as const };
    const [apis, evaluations, results] = await Promise.all([
      this.prisma.api.findMany({ where: { OR: [{ name: contains }, { owner: contains }, { description: contains }] }, take: 8, orderBy: { updatedAt: 'desc' }, select: { id: true, name: true, owner: true, status: true } }),
      this.prisma.governanceExecution.findMany({
        where: { OR: [{ document: { fileName: contains } }, { document: { apiVersion: { api: { name: contains } } } }] },
        take: 8, orderBy: { requestedAt: 'desc' },
        select: { id: true, status: true, qualityScore: true, document: { select: { fileName: true, apiVersion: { select: { api: { select: { name: true } } } } } } },
      }),
      this.prisma.ruleResult.findMany({
        where: { status: { in: ['FAIL', 'WARNING'] }, OR: [{ ruleId: contains }, { ruleName: contains }, { message: contains }] },
        take: 8, orderBy: { id: 'desc' },
        select: { id: true, ruleId: true, ruleName: true, status: true, executionId: true },
      }),
    ]);
    return {
      apis: apis.map(a => ({ id: a.id, title: a.name, description: `${a.owner} · ${a.status}`, url: `/app/apis/${encodeURIComponent(a.id)}` })),
      evaluations: evaluations.map(e => ({ id: e.id, title: e.document.apiVersion.api.name, description: `${e.document.fileName} · ${e.status} · Score: ${e.qualityScore ?? '—'}`, url: `/app/evaluations/${encodeURIComponent(e.id)}` })),
      findings: results.map(r => ({ id: r.id, title: `${r.ruleId} — ${r.ruleName ?? 'Regla'}`, description: r.status, url: `/app/evaluations/${encodeURIComponent(r.executionId)}` })),
    };
  }
}
