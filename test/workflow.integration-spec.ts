
import { randomUUID } from 'node:crypto';

import {
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';

import {
  Test,
  type TestingModule,
} from '@nestjs/testing';

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
} from 'vitest';

import request from 'supertest';
import * as argon2 from 'argon2';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const API_PREFIX = '/api/v1';

const TEST_PASSWORD = 'IntegrationTest-2026-Segura!';

interface TestFixture {
  apiId: string;
  versionId: string;
  documentId: string;
}

describe('API Governance - Workflow Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let reviewerToken: string;
  let developerToken: string;

  const createdUserIds: string[] = [];
  const createdApiIds: string[] = [];
  const createdVersionIds: string[] = [];

  // --------------------------------------------
  // CONFIGURACIÓN INICIAL
  // --------------------------------------------

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL no está configurada.',
      );
    }

    const databaseName = decodeURIComponent(
      new URL(databaseUrl).pathname.replace(/^\/+/, ''),
    );

    // Protección para evitar modificar desarrollo.
    if (
      process.env.NODE_ENV !== 'test' ||
      databaseName !== 'api_governance_test'
    ) {
      throw new Error(
        'Las pruebas solamente pueden ejecutarse ' +
        'sobre la base api_governance_test.',
      );
    }

    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api/v1');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);

    // Crear los roles si no existen.
    for (const name of [
      'ADMIN',
      'REVIEWER',
      'DEVELOPER',
    ]) {
      await prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      });
    }

    const passwordHash = await argon2.hash(
      TEST_PASSWORD,
      {
        type: argon2.argon2id,
      },
    );

    // --------------------------------------------
    // USUARIOS DE PRUEBA
    // --------------------------------------------

    async function createTestUser(
      role: 'ADMIN' | 'REVIEWER' | 'DEVELOPER',
    ): Promise<string> {
      const email =
        `integration-${randomUUID()}@example.test`;

      const user = await prisma.user.create({
        data: {
          email,
          displayName: `Integration ${role}`,
          passwordHash,

          roles: {
            create: [
              {
                role: {
                  connect: {
                    name: role,
                  },
                },
              },
            ],
          },
        },
      });

      createdUserIds.push(user.id);

      // Autenticación real a través de NestJS.
      const response = await request(
        app.getHttpServer(),
      )
        .post(`${API_PREFIX}/auth/login`)
        .set('Origin', 'http://localhost:5173')
        .send({
          email,
          password: TEST_PASSWORD,
        })
        .expect(201);

      expect(
        typeof response.body.accessToken,
      ).toBe('string');

      return response.body.accessToken as string;
    }

    adminToken = await createTestUser('ADMIN');

    reviewerToken = await createTestUser(
      'REVIEWER',
    );

    developerToken = await createTestUser(
      'DEVELOPER',
    );
  }, 30000);

  // --------------------------------------------
  // CREAR API, VERSIÓN Y DOCUMENTO
  // --------------------------------------------

  async function createFixture():
    Promise<TestFixture> {
    const api = await prisma.api.create({
      data: {
        name: `Integration API ${randomUUID()}`,
        description: 'API de pruebas automatizadas',
        owner: 'Equipo QA',
        status: 'DRAFT',
      },
    });

    createdApiIds.push(api.id);

    const version = await prisma.apiVersion.create({
      data: {
        apiId: api.id,
        version: '1.0.0',
        description: 'Versión de integración',
        status: 'DRAFT',
        workflowStatus: 'IN_REVIEW',
      },
    });

    createdVersionIds.push(version.id);

    const document =
      await prisma.openApiDocument.create({
        data: {
          versionId: version.id,
          fileName: 'integration-api.json',
          format: 'JSON',
          openApiVersion: '3.0.3',
          isValid: true,
          uploadedBy: createdUserIds[0],

          content: JSON.stringify({
            openapi: '3.0.3',
            info: {
              title: 'Integration API',
              version: '1.0.0',
            },
            paths: {},
          }),
        },
      });

    return {
      apiId: api.id,
      versionId: version.id,
      documentId: document.id,
    };
  }

  // --------------------------------------------
  // CREAR EVALUACIÓN CONTROLADA
  // --------------------------------------------

  async function createEvaluation(
    documentId: string,
    withBlocker = false,
  ) {
    return prisma.governanceExecution.create({
      data: {
        documentId,
        executedBy: createdUserIds[0],

        status: 'COMPLETED',
        requestedAt: new Date(),
        completedAt: new Date(),

        totalRules: 18,
        passedRules: withBlocker ? 17 : 18,
        failedRules: withBlocker ? 1 : 0,
        warningRules: 0,
        notApplicableRules: 0,

        qualityScore: withBlocker ? 90 : 100,
        hasBlockingIssues: withBlocker,

        results: {
          create: Array.from(
            { length: 18 },
            (_, index) => {
              const isBlocked =
                withBlocker && index === 0;

              return {
                ruleId: `TEST-${index + 1}`,
                ruleName: `Regla ${index + 1}`,

                category: 'SECURITY' as const,
                severity: 'HIGH' as const,

                status: isBlocked
                  ? ('FAIL' as const)
                  : ('PASS' as const),

                weight: 1,

                message: isBlocked
                  ? 'Incumplimiento bloqueante.'
                  : 'Regla cumplida.',
              };
            },
          ),
        },
      },
    });
  }

  function getWorkflowUrl(
    fixture: TestFixture,
  ): string {
    return (
      `${API_PREFIX}/apis/${fixture.apiId}` +
      `/versions/${fixture.versionId}/workflow`
    );
  }

  // ============================================
  // INT-001: APROBACIÓN SIN EVALUACIÓN
  // ============================================

  it(
    'INT-001: rechaza aprobación sin evaluación',
    async () => {
      const fixture = await createFixture();

      await request(app.getHttpServer())
        .patch(getWorkflowUrl(fixture))
        .set(
          'Authorization',
          `Bearer ${reviewerToken}`,
        )
        .send({
          toStatus: 'APPROVED',
        })
        .expect(409);

      const version =
        await prisma.apiVersion.findUniqueOrThrow({
          where: {
            id: fixture.versionId,
          },
        });

      expect(version.workflowStatus).toBe(
        'IN_REVIEW',
      );

      const transitions =
        await prisma.workflowTransition.count({
          where: {
            versionId: fixture.versionId,
          },
        });

      expect(transitions).toBe(0);
    },
  );

  // ============================================
  // INT-002: APROBACIÓN CON BLOQUEANTES
  // ============================================

  it(
    'INT-002: rechaza evaluación con bloqueantes',
    async () => {
      const fixture = await createFixture();

      await createEvaluation(
        fixture.documentId,
        true,
      );

      await request(app.getHttpServer())
        .patch(getWorkflowUrl(fixture))
        .set(
          'Authorization',
          `Bearer ${reviewerToken}`,
        )
        .send({
          toStatus: 'APPROVED',
        })
        .expect(409);

      const transitions =
        await prisma.workflowTransition.count({
          where: {
            versionId: fixture.versionId,
          },
        });

      expect(transitions).toBe(0);
    },
  );

  // ============================================
  // INT-003: CONTROL DE PERMISOS
  // ============================================

  it(
    'INT-003: impide aprobar con rol DEVELOPER',
    async () => {
      const fixture = await createFixture();

      await createEvaluation(
        fixture.documentId,
        false,
      );

      await request(app.getHttpServer())
        .patch(getWorkflowUrl(fixture))
        .set(
          'Authorization',
          `Bearer ${developerToken}`,
        )
        .send({
          toStatus: 'APPROVED',
        })
        .expect(403);

      const transitions =
        await prisma.workflowTransition.count({
          where: {
            versionId: fixture.versionId,
          },
        });

      expect(transitions).toBe(0);
    },
  );

  // ============================================
  // INT-004: APROBACIÓN Y PUBLICACIÓN
  // ============================================

  it(
    'INT-004: aprueba y publica conservando evidencia',
    async () => {
      const fixture = await createFixture();

      const evaluation =
        await createEvaluation(
          fixture.documentId,
          false,
        );

      // 1. Aprobar como REVIEWER.
      const approval = await request(
        app.getHttpServer(),
      )
        .patch(getWorkflowUrl(fixture))
        .set(
          'Authorization',
          `Bearer ${reviewerToken}`,
        )
        .send({
          toStatus: 'APPROVED',
          comment: 'Evaluación conforme.',
        })
        .expect(200);

      expect(
        approval.body.currentStatus,
      ).toBe('APPROVED');

      // 2. Verificar evidencia de aprobación.
      const approvalTransition =
        await prisma.workflowTransition.findFirstOrThrow({
          where: {
            versionId: fixture.versionId,
            toStatus: 'APPROVED',
          },
        });

      expect(
        approvalTransition.evaluationId,
      ).toBe(evaluation.id);

      expect(
        approvalTransition.evaluatedDocumentId,
      ).toBe(fixture.documentId);

      expect(
        approvalTransition.evaluationScore,
      ).toBe(100);

      expect(
        approvalTransition.evaluatedRules,
      ).toBe(18);

      expect(
        approvalTransition.evaluationHasBlockingIssues,
      ).toBe(false);

      // 3. Publicar como ADMIN.
      const publication = await request(
        app.getHttpServer(),
      )
        .patch(getWorkflowUrl(fixture))
        .set(
          'Authorization',
          `Bearer ${adminToken}`,
        )
        .send({
          toStatus: 'PUBLISHED',
        })
        .expect(200);

      expect(
        publication.body.currentStatus,
      ).toBe('PUBLISHED');

      // 4. Verificar PostgreSQL.
      const [
        version,
        api,
        history,
      ] = await Promise.all([
        prisma.apiVersion.findUniqueOrThrow({
          where: {
            id: fixture.versionId,
          },
        }),

        prisma.api.findUniqueOrThrow({
          where: {
            id: fixture.apiId,
          },
        }),

        prisma.workflowTransition.findMany({
          where: {
            versionId: fixture.versionId,
          },
        }),
      ]);

      expect(version.workflowStatus).toBe(
        'PUBLISHED',
      );

      expect(version.status).toBe('ACTIVE');

      expect(api.status).toBe('ACTIVE');

      expect(history).toHaveLength(2);

      // 5. Validar historial desde la API.
      const historyResponse = await request(
        app.getHttpServer(),
      )
        .get(
          `${getWorkflowUrl(fixture)}/history`,
        )
        .set(
          'Authorization',
          `Bearer ${adminToken}`,
        )
        .expect(200);

      expect(
        historyResponse.body.totalTransitions,
      ).toBe(2);

      // 6. Consultar auditoría centralizada.
      const auditResponse = await request(
        app.getHttpServer(),
      )
        .get(`${API_PREFIX}/audit`)
        .query({
          page: 1,
          limit: 20,
          api: api.name,
        })
        .set(
          'Authorization',
          `Bearer ${adminToken}`,
        )
        .expect(200);

      expect(
        auditResponse.body.items.some(
          (item: { id: string }) =>
            item.id === approvalTransition.id,
        ),
      ).toBe(true);
    },
  );

  // ============================================
  // LIMPIEZA DE DATOS DE PRUEBA
  // ============================================

  afterAll(async () => {
    if (!prisma) {
      if (app) await app.close();
      return;
    }

    try {
      if (createdVersionIds.length > 0) {
        const documents =
          await prisma.openApiDocument.findMany({
            where: {
              versionId: {
                in: createdVersionIds,
              },
            },
            select: {
              id: true,
            },
          });

        const documentIds =
          documents.map((document) => document.id);

        const evaluations =
          await prisma.governanceExecution.findMany({
            where: {
              documentId: {
                in: documentIds,
              },
            },
            select: {
              id: true,
            },
          });

        const evaluationIds =
          evaluations.map((evaluation) => evaluation.id);

        await prisma.workflowTransition.deleteMany({
          where: {
            versionId: {
              in: createdVersionIds,
            },
          },
        });

        if (evaluationIds.length > 0) {
          await prisma.ruleResult.deleteMany({
            where: {
              executionId: {
                in: evaluationIds,
              },
            },
          });

          await prisma.governanceExecution.deleteMany({
            where: {
              id: {
                in: evaluationIds,
              },
            },
          });
        }

        await prisma.openApiDocument.deleteMany({
          where: {
            versionId: {
              in: createdVersionIds,
            },
          },
        });

        await prisma.apiVersion.deleteMany({
          where: {
            id: {
              in: createdVersionIds,
            },
          },
        });
      }

      if (createdApiIds.length > 0) {
        await prisma.api.deleteMany({
          where: {
            id: {
              in: createdApiIds,
            },
          },
        });
      }

      if (createdUserIds.length > 0) {
        await prisma.authSession.deleteMany({
          where: {
            userId: {
              in: createdUserIds,
            },
          },
        });

        await prisma.user.deleteMany({
          where: {
            id: {
              in: createdUserIds,
            },
          },
        });
      }
    } finally {
      await app?.close();
    }
  }, 30000);
});
