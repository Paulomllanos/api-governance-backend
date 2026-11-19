
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

type FindingState = 'NEW' | 'PERSISTENT' | 'RESOLVED';

type FindingStatus = 'FAIL' | 'WARNING';

function isFinding(
  status: string,
): status is FindingStatus {
  return status === 'FAIL' || status === 'WARNING';
}

@Injectable()
export class FindingsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAll() {
    const documents =
      await this.prisma.openApiDocument.findMany({
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
        select: {
          id: true,
          versionId: true,
          fileName: true,
          apiVersion: {
            select: {
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
      });

    // Conservamos solamente el documento
    // más reciente de cada versión.
    const latestDocuments = new Map<
      string,
      (typeof documents)[number]
    >();

    for (const document of documents) {
      if (!latestDocuments.has(document.versionId)) {
        latestDocuments.set(
          document.versionId,
          document,
        );
      }
    }

    const groups = await Promise.all(
      [...latestDocuments.values()].map(
        async (document) => {
          const current =
            await this.prisma.governanceExecution.findFirst({
              where: {
                documentId: document.id,
              },
              orderBy: [
                { requestedAt: 'desc' },
                { id: 'desc' },
              ],
              include: {
                results: true,
              },
            });

          // No afirmamos que los hallazgos antiguos
          // sigan vigentes cuando el documento más
          // reciente no tiene evaluación completada.
          if (!current || current.status !== 'COMPLETED') {
            return {
              versionId: document.versionId,
              documentId: document.id,
              evaluationId: current?.id ?? null,
              evaluationStatus:
                current?.status ?? 'NOT_EVALUATED',
              findings: [],
            };
          }

          const previous =
            await this.prisma.governanceExecution.findFirst({
              where: {
                document: {
                  versionId: document.versionId,
                },
                status: 'COMPLETED',
                requestedAt: {
                  lt: current.requestedAt,
                },
              },
              orderBy: [
                { requestedAt: 'desc' },
                { id: 'desc' },
              ],
              include: {
                results: true,
              },
            });

          const previousByRule = new Map(
            (previous?.results ?? []).map(
              (result) => [result.ruleId, result],
            ),
          );

          const currentByRule = new Map(
            current.results.map(
              (result) => [result.ruleId, result],
            ),
          );

          const findings = [];

          // Hallazgos presentes en la evaluación actual.
          for (const result of current.results) {
            if (!isFinding(result.status)) {
              continue;
            }

            const previousResult =
              previousByRule.get(result.ruleId);

            const state: FindingState =
              previousResult &&
              isFinding(previousResult.status)
                ? 'PERSISTENT'
                : 'NEW';

            findings.push({
              id: result.id,
              ruleId: result.ruleId,
              ruleName: result.ruleName,
              category: result.category,
              severity: result.severity,
              status: result.status,
              state,
              message: result.message,
              evidence: result.evidence,
              recommendation: result.recommendation,
              previousStatus:
                previousResult?.status ?? null,
              apiId: document.apiVersion.api.id,
              apiName: document.apiVersion.api.name,
              versionId: document.versionId,
              version: document.apiVersion.version,
              documentId: document.id,
              documentName: document.fileName,
              evaluationId: current.id,
              evaluatedAt:
                current.completedAt ??
                current.requestedAt,
            });
          }

          // Un hallazgo solo se considera corregido
          // cuando la regla devuelve PASS.
          for (const previousResult of previous?.results ?? []) {
            if (!isFinding(previousResult.status)) {
              continue;
            }

            const currentResult =
              currentByRule.get(previousResult.ruleId);

            if (currentResult?.status !== 'PASS') {
              continue;
            }

            findings.push({
              id: currentResult.id,
              ruleId: currentResult.ruleId,
              ruleName:
                currentResult.ruleName ??
                previousResult.ruleName,
              category: currentResult.category,
              severity: currentResult.severity,
              status: currentResult.status,
              state: 'RESOLVED' as FindingState,
              message: currentResult.message,
              evidence: currentResult.evidence,
              recommendation: null,
              previousStatus: previousResult.status,
              apiId: document.apiVersion.api.id,
              apiName: document.apiVersion.api.name,
              versionId: document.versionId,
              version: document.apiVersion.version,
              documentId: document.id,
              documentName: document.fileName,
              evaluationId: current.id,
              evaluatedAt:
                current.completedAt ??
                current.requestedAt,
            });
          }

          return {
            versionId: document.versionId,
            documentId: document.id,
            evaluationId: current.id,
            evaluationStatus: current.status,
            findings,
          };
        },
      ),
    );

    const findings = groups.flatMap(
      (group) => group.findings,
    );

    return {
      summary: {
        total: findings.length,
        new: findings.filter(
          (item) => item.state === 'NEW',
        ).length,
        persistent: findings.filter(
          (item) => item.state === 'PERSISTENT',
        ).length,
        resolved: findings.filter(
          (item) => item.state === 'RESOLVED',
        ).length,
        pendingEvaluationVersions: groups.filter(
          (group) =>
            group.evaluationStatus !== 'COMPLETED',
        ).length,
      },
      findings,
    };
  }
}
