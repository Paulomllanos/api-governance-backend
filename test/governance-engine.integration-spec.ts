
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

const PREFIX = '/api/v1';
const PASSWORD = 'IntegrationTest-2026-Segura!';

interface TestResponse {
  id: string;
}

interface RuleResult {
  ruleId: string;
  status: string;
  severity: string | null;
}

interface EvaluationResponse {
  id: string;
  status: string;
  totalRules: number;
  qualityScore: number | null;
  hasBlockingIssues: boolean | null;
  results: RuleResult[];
}

interface Finding {
  ruleId: string;
  state: string;
  versionId: string;
  status: string;
}

interface FindingsResponse {
  findings: Finding[];
}

function buildOpenApi(withSecurity: boolean) {
  return {
    openapi: '3.0.3',

    info: {
      title: 'API Integration Test',
      version: '1.0.0',
      description:
        'API utilizada para validar el motor de gobierno.',
    },

    paths: {
      '/customers': {
        get: {
          operationId: 'getCustomers',
          summary: 'Consultar clientes',
          description: 'Recupera una lista de clientes.',

          responses: {
            '200': {
              description: 'Operación exitosa',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      description: 'Representación del cliente',
                      properties: {
                        id: {
                          type: 'string',
                          description:
                            'Identificador del cliente',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    ...(withSecurity
      ? {
          security: [{ bearerAuth: [] }],

          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
              },
            },
          },
        }
      : {}),
  };
}

describe('Gobierno OpenAPI — Integración real', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let token: string;
  let userId: string;

  const createdApiIds: string[] = [];
  const createdVersionIds: string[] = [];

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

    if (
      process.env.NODE_ENV !== 'test' ||
      databaseName !== 'api_governance_test'
    ) {
      throw new Error(
        'Estas pruebas solo pueden ejecutarse ' +
        'contra api_governance_test.',
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

    // Utilizamos ADMIN para enfocarnos en el motor,
    // no en las restricciones RBAC ya probadas.
    await prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: { name: 'ADMIN' },
    });

    const user = await prisma.user.create({
      data: {
        email:
          `engine-${randomUUID()}@example.test`,

        displayName: 'Integration Engine Admin',

        passwordHash: await argon2.hash(PASSWORD, {
          type: argon2.argon2id,
        }),

        roles: {
          create: [{
            role: {
              connect: { name: 'ADMIN' },
            },
          }],
        },
      },
    });

    userId = user.id;

    const login = await request(
      app.getHttpServer(),
    )
      .post(`${PREFIX}/auth/login`)
      .set('Origin', 'http://localhost:5173')
      .send({
        email: user.email,
        password: PASSWORD,
      })
      .expect(201);

    token = login.body.accessToken as string;

    expect(token).toBeTruthy();
  }, 30000);

  function authenticatedPost(url: string) {
    return request(app.getHttpServer())
      .post(url)
      .set('Authorization', `Bearer ${token}`);
  }

  function authenticatedGet(url: string) {
    return request(app.getHttpServer())
      .get(url)
      .set('Authorization', `Bearer ${token}`);
  }

  async function createApiAndVersion() {
    const apiResponse = await authenticatedPost(
      `${PREFIX}/apis`,
    )
      .send({
        name: `Governance Test ${randomUUID()}`,
        description:
          'API para integración automatizada',
        owner: 'Equipo QA',
      })
      .expect(201);

    const api = apiResponse.body as TestResponse;

    createdApiIds.push(api.id);

    const versionResponse = await authenticatedPost(
      `${PREFIX}/apis/${api.id}/versions`,
    )
      .send({
        version: '1.0.0',
        description: 'Versión de prueba',
      })
      .expect(201);

    const version =
      versionResponse.body as TestResponse;

    createdVersionIds.push(version.id);

    return {
      apiId: api.id,
      versionId: version.id,
    };
  }

  async function uploadDocument(
    versionId: string,
    withSecurity: boolean,
  ) {
    const response = await authenticatedPost(
      `${PREFIX}/versions/${versionId}/documents`,
    )
      .send({
        fileName: withSecurity
          ? 'api-corrected.json'
          : 'api-initial.json',

        format: 'JSON',

        content: JSON.stringify(
          buildOpenApi(withSecurity),
        ),
      })
      .expect(201);

    return response.body as TestResponse;
  }

  async function executeEvaluation(
    documentId: string,
  ): Promise<EvaluationResponse> {
    const created = await authenticatedPost(
      `${PREFIX}/documents/${documentId}/evaluations`,
    )
      .expect(201);

    const execution = created.body as TestResponse;

    const executed = await authenticatedPost(
      `${PREFIX}/evaluations/${execution.id}/execute`,
    )
      .expect(201);

    return executed.body as EvaluationResponse;
  }

  // -------------------------------------------------
  // INT-005: VALIDACIÓN DE INGESTA
  // -------------------------------------------------

  it(
    'INT-005: rechaza un documento OpenAPI inválido',
    async () => {
      const { versionId } =
        await createApiAndVersion();

      await authenticatedPost(
        `${PREFIX}/versions/${versionId}/documents`,
      )
        .send({
          fileName: 'invalid.json',
          format: 'JSON',
          content: JSON.stringify({
            info: {
              title: 'Invalid API',
              version: '1.0.0',
            },
            paths: {},
          }),
        })
        .expect(400);

      const count =
        await prisma.openApiDocument.count({
          where: { versionId },
        });

      expect(count).toBe(0);
    },
  );

  // -------------------------------------------------
  // INT-006, INT-007, INT-008, INT-009
  // -------------------------------------------------

  it(
    'INT-006/009: ejecuta y registra 18 reglas reales',
    async () => {
      const { versionId } =
        await createApiAndVersion();

      const document = await uploadDocument(
        versionId,
        false,
      );

      // Ejecutamos el motor real.
      const evaluation = await executeEvaluation(
        document.id,
      );

      expect(evaluation.status).toBe('COMPLETED');

      expect(evaluation.totalRules).toBe(18);
      expect(evaluation.results).toHaveLength(18);

      const uniqueIds = new Set(
        evaluation.results.map(
          (rule) => rule.ruleId,
        ),
      );

      expect(uniqueIds.size).toBe(18);

      const securityRule =
        evaluation.results.find(
          (rule) =>
            rule.ruleId === 'SECURITY-001',
        );

      expect(securityRule).toBeDefined();
      expect(securityRule?.status).toBe('FAIL');
      expect(securityRule?.severity).toBe('HIGH');

      expect(
        evaluation.hasBlockingIssues,
      ).toBe(true);

      expect(
        evaluation.qualityScore,
      ).not.toBeNull();

      // Comprobamos también la base de datos.
      const stored =
        await prisma.governanceExecution.findUniqueOrThrow({
          where: { id: evaluation.id },
          include: { results: true },
        });

      expect(stored.status).toBe('COMPLETED');
      expect(stored.results).toHaveLength(18);

      expect(stored.qualityScore).toBe(
        evaluation.qualityScore,
      );

      // INT-009: no puede ejecutarse dos veces.
      await authenticatedPost(
        `${PREFIX}/evaluations/${evaluation.id}/execute`,
      )
        .expect(409);
    },
  );

  it(
    'INT-007/008: corrige seguridad y marca RESOLVED',
    async () => {
      const { versionId } =
        await createApiAndVersion();

      const originalDocument =
        await uploadDocument(versionId, false);

      const originalEvaluation =
        await executeEvaluation(originalDocument.id);

      expect(
        originalEvaluation.results.find(
          (rule) =>
            rule.ruleId === 'SECURITY-001',
        )?.status,
      ).toBe('FAIL');

      // Fecha anterior explícita para comparar
      // correctamente las evaluaciones.
      await prisma.governanceExecution.update({
        where: { id: originalEvaluation.id },
        data: {
          requestedAt: new Date(
            Date.now() - 60_000,
          ),
        },
      });

      // Cargamos una nueva especificación corregida.
      const correctedDocument =
        await uploadDocument(versionId, true);

      const correctedEvaluation =
        await executeEvaluation(correctedDocument.id);

      expect(correctedEvaluation.status).toBe(
        'COMPLETED',
      );

      expect(correctedEvaluation.totalRules).toBe(18);
      expect(correctedEvaluation.results).toHaveLength(
        18,
      );

      expect(
        correctedEvaluation.results.find(
          (rule) =>
            rule.ruleId === 'SECURITY-001',
        )?.status,
      ).toBe('PASS');

      expect(
        correctedEvaluation.qualityScore,
      ).not.toBeNull();

      expect(
        correctedEvaluation.qualityScore!,
      ).toBeGreaterThan(
        originalEvaluation.qualityScore!,
      );

      // Consultar los hallazgos reales.
      const findingsResponse =
        await authenticatedGet(
          `${PREFIX}/findings`,
        ).expect(200);

      const findings =
        (findingsResponse.body as FindingsResponse)
          .findings.filter(
            (finding) =>
              finding.versionId === versionId,
          );

      const correctedFinding = findings.find(
        (finding) =>
          finding.ruleId === 'SECURITY-001' &&
          finding.state === 'RESOLVED',
      );

      expect(correctedFinding).toBeDefined();
      expect(correctedFinding?.status).toBe('PASS');
    },
  );

  // -------------------------------------------------
  // LIMPIEZA
  // -------------------------------------------------

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
            select: { id: true },
          });

        const documentIds = documents.map(
          (document) => document.id,
        );

        const evaluations =
          await prisma.governanceExecution.findMany({
            where: {
              documentId: {
                in: documentIds,
              },
            },
            select: { id: true },
          });

        const evaluationIds = evaluations.map(
          (evaluation) => evaluation.id,
        );

        // Primero los registros dependientes.
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

      if (userId) {
        // Las sesiones y roles asignados del usuario
        // se eliminan mediante sus relaciones Cascade.
        await prisma.user.delete({
          where: { id: userId },
        });
      }
    } finally {
      await app?.close();
    }
  }, 30000);
});
