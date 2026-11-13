
import { randomUUID } from 'node:crypto';

import {
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';

import {
  Test,
  type TestingModule,
} from '@nestjs/testing';

import { JwtService } from '@nestjs/jwt';

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

const PREFIX = '/api/v1';
const PASSWORD = 'IntegrationSecurity-2026-Segura!';

interface Fixture {
  apiId: string;
  versionId: string;
  documentId: string;
}

const openApi = {
  openapi: '3.0.3',
  info: {
    title: 'Security Integration API',
    version: '1.0.0',
    description: 'API de pruebas de seguridad.',
  },
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
      },
    },
  },
  paths: {
    '/customers': {
      get: {
        operationId: 'getCustomers',
        summary: 'Consultar clientes',
        description: 'Retorna clientes.',
        responses: {
          '200': {
            description: 'Respuesta correcta.',
          },
        },
      },
    },
  },
};

describe('Seguridad, integridad y concurrencia', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let adminToken: string;
  let reviewerToken: string;
  let developerToken: string;

  let adminId: string;

  const userIds: string[] = [];
  const apiIds: string[] = [];
  const versionIds: string[] = [];

  beforeAll(async () => {
    // Impedir que las pruebas afecten desarrollo.
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL no configurada.');
    }

    const databaseName = decodeURIComponent(
      new URL(databaseUrl).pathname.replace(/^\/+/, ''),
    );

    if (
      process.env.NODE_ENV !== 'test' ||
      databaseName !== 'api_governance_test'
    ) {
      throw new Error(
        'Solo se permite ejecutar esta suite ' +
        'en api_governance_test.',
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
    jwtService = app.get(JwtService);

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
      PASSWORD,
      { type: argon2.argon2id },
    );

    async function createUser(
      role: 'ADMIN' | 'REVIEWER' | 'DEVELOPER',
    ) {
      const user = await prisma.user.create({
        data: {
          email: `security-${randomUUID()}@example.test`,
          displayName: `Security ${role}`,
          passwordHash,
          roles: {
            create: [{
              role: {
                connect: { name: role },
              },
            }],
          },
        },
      });

      userIds.push(user.id);

      const response = await request(
        app.getHttpServer(),
      )
        .post(`${PREFIX}/auth/login`)
        .set('Origin', 'http://localhost:5173')
        .send({
          email: user.email,
          password: PASSWORD,
        })
        .expect(201);

      return {
        id: user.id,
        token: response.body.accessToken as string,
      };
    }

    const admin = await createUser('ADMIN');
    const reviewer = await createUser('REVIEWER');
    const developer = await createUser('DEVELOPER');

    adminId = admin.id;
    adminToken = admin.token;
    reviewerToken = reviewer.token;
    developerToken = developer.token;
  }, 30000);

  // ---------------------------------------------
  // FUNCIONES AUXILIARES
  // ---------------------------------------------

  async function createFixture(
    workflowStatus: 'DRAFT' | 'IN_REVIEW' = 'DRAFT',
  ): Promise<Fixture> {
    const api = await prisma.api.create({
      data: {
        name: `Security API ${randomUUID()}`,
        description: 'Pruebas automatizadas',
        owner: 'Equipo QA',
        status: 'DRAFT',
      },
    });

    apiIds.push(api.id);

    const version = await prisma.apiVersion.create({
      data: {
        apiId: api.id,
        version: '1.0.0',
        description: 'Versión de seguridad',
        status: 'DRAFT',
        workflowStatus,
      },
    });

    versionIds.push(version.id);

    const document = await prisma.openApiDocument.create({
      data: {
        versionId: version.id,
        fileName: 'security-test.json',
        format: 'JSON',
        content: JSON.stringify(openApi),
        openApiVersion: '3.0.3',
        isValid: true,
        uploadedBy: adminId,
      },
    });

    return {
      apiId: api.id,
      versionId: version.id,
      documentId: document.id,
    };
  }

  function workflowUrl(fixture: Fixture) {
    return (
      `${PREFIX}/apis/${fixture.apiId}` +
      `/versions/${fixture.versionId}/workflow`
    );
  }

  async function createCompletedEvaluation(
    documentId: string,
  ) {
    return prisma.governanceExecution.create({
      data: {
        documentId,
        executedBy: adminId,
        status: 'COMPLETED',
        totalRules: 18,
        passedRules: 18,
        failedRules: 0,
        warningRules: 0,
        notApplicableRules: 0,
        qualityScore: 100,
        hasBlockingIssues: false,
        completedAt: new Date(),

        results: {
          create: Array.from(
            { length: 18 },
            (_, index) => ({
              ruleId: `SEC-TEST-${index + 1}`,
              ruleName: `Regla ${index + 1}`,
              category: 'SECURITY' as const,
              severity: 'HIGH' as const,
              weight: 1,
              status: 'PASS' as const,
              message: 'Cumple la regla.',
            }),
          ),
        },
      },
    });
  }

  // ---------------------------------------------
  // SEC-001: SOLICITUD SIN JWT
  // ---------------------------------------------

  it('SEC-001: rechaza solicitudes sin JWT', async () => {
    await request(app.getHttpServer())
      .get(`${PREFIX}/apis`)
      .expect(401);
  });

  // ---------------------------------------------
  // SEC-002: TOKEN MANIPULADO
  // ---------------------------------------------

  it('SEC-002: rechaza JWT manipulado', async () => {
    const parts = adminToken.split('.');

    const signature = parts[2];

    if (!signature) {
      throw new Error('JWT de prueba inválido.');
    }

    // Modificar un carácter de la firma.
    const modifiedSignature =
      (signature[0] === 'A' ? 'B' : 'A') +
      signature.slice(1);

    const invalidToken = [
      parts[0],
      parts[1],
      modifiedSignature,
    ].join('.');

    await request(app.getHttpServer())
      .get(`${PREFIX}/apis`)
      .set('Authorization', `Bearer ${invalidToken}`)
      .expect(401);
  });

  // ---------------------------------------------
  // SEC-003: JWT EXPIRADO
  // ---------------------------------------------

  it('SEC-003: rechaza un JWT expirado', async () => {
    const expiredToken = await jwtService.signAsync(
      { sub: adminId },
      { expiresIn: -10 },
    );

    await request(app.getHttpServer())
      .get(`${PREFIX}/apis`)
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  // ---------------------------------------------
  // SEC-004: CONTROL RBAC
  // ---------------------------------------------

  it('SEC-004: impide al REVIEWER cargar documentos', async () => {
    const fixture = await createFixture();

    await request(app.getHttpServer())
      .post(
        `${PREFIX}/versions/${fixture.versionId}/documents`,
      )
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({
        fileName: 'unauthorized.json',
        format: 'JSON',
        content: JSON.stringify(openApi),
      })
      .expect(403);

    expect(
      await prisma.openApiDocument.count({
        where: { versionId: fixture.versionId },
      }),
    ).toBe(1);
  });

  // ---------------------------------------------
  // SEC-005: TRANSICIÓN NO PERMITIDA
  // ---------------------------------------------

  it('SEC-005: impide saltar de DRAFT a PUBLISHED', async () => {
    const fixture = await createFixture();

    await request(app.getHttpServer())
      .patch(workflowUrl(fixture))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ toStatus: 'PUBLISHED' })
      .expect(409);

    expect(
      await prisma.workflowTransition.count({
        where: { versionId: fixture.versionId },
      }),
    ).toBe(0);
  });

  // ---------------------------------------------
  // SEC-006: DOCUMENTO DESACTUALIZADO
  // ---------------------------------------------

  it('SEC-006: no aprueba con evaluación antigua', async () => {
    const fixture = await createFixture('IN_REVIEW');

    await createCompletedEvaluation(fixture.documentId);

    // Insertar otro documento más reciente.
    // Se utiliza una fecha explícita para evitar
    // empates en la ordenación de documentos.
    const oldDocument = await prisma.openApiDocument
      .findUniqueOrThrow({
        where: { id: fixture.documentId },
      });

    await prisma.openApiDocument.update({
      where: { id: oldDocument.id },
      data: {
        createdAt: new Date(Date.now() - 60_000),
      },
    });

    await prisma.openApiDocument.create({
      data: {
        versionId: fixture.versionId,
        fileName: 'security-test-v2.json',
        format: 'JSON',
        content: JSON.stringify(openApi),
        openApiVersion: '3.0.3',
        isValid: true,
        uploadedBy: adminId,
      },
    });

    await request(app.getHttpServer())
      .patch(workflowUrl(fixture))
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ toStatus: 'APPROVED' })
      .expect(409);

    expect(
      await prisma.workflowTransition.count({
        where: { versionId: fixture.versionId },
      }),
    ).toBe(0);
  });

  // ---------------------------------------------
  // SEC-007: EVALUACIÓN CONCURRENTE
  // ---------------------------------------------

  it('SEC-007: solo ejecuta una evaluación una vez', async () => {
    const fixture = await createFixture();

    const evaluation =
      await prisma.governanceExecution.create({
        data: {
          documentId: fixture.documentId,
          executedBy: adminId,
          status: 'PENDING',
        },
      });

    // Dos solicitudes concurrentes reales.
    const responses = await Promise.all([
      request(app.getHttpServer())
        .post(
          `${PREFIX}/evaluations/${evaluation.id}/execute`,
        )
        .set('Authorization', `Bearer ${developerToken}`),

      request(app.getHttpServer())
        .post(
          `${PREFIX}/evaluations/${evaluation.id}/execute`,
        )
        .set('Authorization', `Bearer ${developerToken}`),
    ]);

    const statuses = responses
      .map((response) => response.status)
      .sort((a, b) => a - b);

    expect(statuses).toEqual([201, 409]);

    const stored = await prisma.governanceExecution
      .findUniqueOrThrow({
        where: { id: evaluation.id },
        include: { results: true },
      });

    expect(stored.status).toBe('COMPLETED');
    expect(stored.results).toHaveLength(18);
  }, 30000);

  // ---------------------------------------------
  // SEC-008: TRANSICIONES CONCURRENTES
  // ---------------------------------------------

  it('SEC-008: impide transiciones duplicadas', async () => {
    const fixture = await createFixture('IN_REVIEW');

    await createCompletedEvaluation(fixture.documentId);

    const responses = await Promise.all([
      request(app.getHttpServer())
        .patch(workflowUrl(fixture))
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({ toStatus: 'APPROVED' }),

      request(app.getHttpServer())
        .patch(workflowUrl(fixture))
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({ toStatus: 'APPROVED' }),
    ]);

    const statuses = responses
      .map((response) => response.status)
      .sort((a, b) => a - b);

    expect(statuses).toEqual([200, 409]);

    const transitions =
      await prisma.workflowTransition.findMany({
        where: {
          versionId: fixture.versionId,
          toStatus: 'APPROVED',
        },
      });

    expect(transitions).toHaveLength(1);

    const version = await prisma.apiVersion
      .findUniqueOrThrow({
        where: { id: fixture.versionId },
      });

    expect(version.workflowStatus).toBe('APPROVED');
  }, 30000);

  // ---------------------------------------------
  // SEC-009: EVIDENCIA HISTÓRICA
  // ---------------------------------------------

  it('SEC-009: conserva evidencia después de reevaluar', async () => {
    const fixture = await createFixture('IN_REVIEW');

    const originalEvaluation =
      await createCompletedEvaluation(
        fixture.documentId,
      );

    await request(app.getHttpServer())
      .patch(workflowUrl(fixture))
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ toStatus: 'APPROVED' })
      .expect(200);

    const originalTransition =
      await prisma.workflowTransition.findFirstOrThrow({
        where: {
          versionId: fixture.versionId,
          toStatus: 'APPROVED',
        },
      });

    // Se crea una nueva evaluación pendiente.
    // No cambiamos el documento ni la versión.
    await prisma.governanceExecution.create({
      data: {
        documentId: fixture.documentId,
        executedBy: adminId,
        status: 'PENDING',
      },
    });

    const persistedTransition =
      await prisma.workflowTransition.findUniqueOrThrow({
        where: {
          id: originalTransition.id,
        },
      });

    expect(
      persistedTransition.evaluationId,
    ).toBe(originalEvaluation.id);

    expect(
      persistedTransition.evaluatedDocumentId,
    ).toBe(fixture.documentId);

    expect(
      persistedTransition.evaluationScore,
    ).toBe(100);

    expect(
      persistedTransition.evaluatedRules,
    ).toBe(18);

    expect(
      persistedTransition.evaluationHasBlockingIssues,
    ).toBe(false);
  });

  // ---------------------------------------------
  // LIMPIEZA DE DATOS
  // ---------------------------------------------

  afterAll(async () => {
    if (!prisma) {
      if (app) await app.close();
      return;
    }

    try {
      if (versionIds.length > 0) {
        const documents =
          await prisma.openApiDocument.findMany({
            where: {
              versionId: { in: versionIds },
            },
            select: { id: true },
          });

        const documentIds =
          documents.map((document) => document.id);

        const evaluations =
          await prisma.governanceExecution.findMany({
            where: {
              documentId: { in: documentIds },
            },
            select: { id: true },
          });

        const evaluationIds =
          evaluations.map((evaluation) => evaluation.id);

        await prisma.workflowTransition.deleteMany({
          where: {
            versionId: { in: versionIds },
          },
        });

        if (evaluationIds.length > 0) {
          await prisma.ruleResult.deleteMany({
            where: {
              executionId: { in: evaluationIds },
            },
          });

          await prisma.governanceExecution.deleteMany({
            where: {
              id: { in: evaluationIds },
            },
          });
        }

        await prisma.openApiDocument.deleteMany({
          where: {
            versionId: { in: versionIds },
          },
        });

        await prisma.apiVersion.deleteMany({
          where: {
            id: { in: versionIds },
          },
        });
      }

      if (apiIds.length > 0) {
        await prisma.api.deleteMany({
          where: {
            id: { in: apiIds },
          },
        });
      }

      if (userIds.length > 0) {
        await prisma.user.deleteMany({
          where: {
            id: { in: userIds },
          },
        });
      }
    } finally {
      await app?.close();
    }
  }, 30000);
});
