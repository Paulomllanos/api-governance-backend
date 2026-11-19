import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const PREFIX = '/api/v1';
const PASSWORD = 'ApiGovernanceTest-2026!';
const origin = 'http://localhost:5173';

let app: INestApplication;
let prisma: PrismaService;
let developerToken: string;
let reviewerToken: string;
let developerId: string;
const userIds: string[] = [];
const apiIds: string[] = [];
const versionIds: string[] = [];
const documentIds: string[] = [];
const executionIds: string[] = [];

async function makeUser(role: 'DEVELOPER' | 'REVIEWER') {
  const roleRecord = await prisma.role.upsert({
    where: { name: role },
    create: { name: role },
    update: {},
  });
  const user = await prisma.user.create({
    data: {
      email: `audit-${randomUUID()}@example.test`,
      displayName: `QA ${role}`,
      passwordHash: await argon2.hash(PASSWORD),
      roles: { create: [{ roleId: roleRecord.id }] },
    },
  });
  userIds.push(user.id);
  const response = await request(app.getHttpServer())
    .post(`${PREFIX}/auth/login`)
    .set('Origin', origin)
    .send({ email: user.email, password: PASSWORD });
  expect(response.status).toBe(201);
  return { id: user.id, token: response.body.accessToken as string };
}

beforeAll(async () => {
  const url = process.env.DATABASE_URL;
  if (!url || !url.includes('/api_governance_test') || process.env.NODE_ENV !== 'test') {
    throw new Error('Ejecutar exclusivamente sobre api_governance_test con NODE_ENV=test.');
  }
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  await app.init();
  prisma = app.get(PrismaService);

  const developer = await makeUser('DEVELOPER');
  const reviewer = await makeUser('REVIEWER');
  developerId = developer.id;
  developerToken = developer.token;
  reviewerToken = reviewer.token;
}, 30000);

afterAll(async () => {
  if (prisma) {
    await prisma.auditEvent.deleteMany({ where: { actorId: { in: userIds } } });
    for (const executionId of executionIds) {
      await prisma.ruleResult.deleteMany({ where: { executionId } });
    }
    await prisma.governanceExecution.deleteMany({ where: { id: { in: executionIds } } });
    await prisma.openApiDocument.deleteMany({ where: { id: { in: documentIds } } });
    await prisma.apiVersion.deleteMany({ where: { id: { in: versionIds } } });
    await prisma.api.deleteMany({ where: { id: { in: apiIds } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userRole.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  if (app) await app.close();
}, 30000);

describe('MVP estabilizado: actor, auditoría, validación y permisos', () => {
  let apiId: string;
  let versionId: string;
  let documentId: string;
  let evaluationId: string;

  it('registra la API y su autor en la auditoría', async () => {
    const response = await request(app.getHttpServer())
      .post(`${PREFIX}/apis`)
      .set('Authorization', `Bearer ${developerToken}`)
      .send({
        name: `MVP QA ${randomUUID()}`,
        description: 'Prueba controlada de integración',
        owner: 'QA DEVELOPER',
      });
    expect(response.status).toBe(201);
    apiId = response.body.id as string;
    apiIds.push(apiId);

    const event = await prisma.auditEvent.findFirst({
      where: { action: 'API_CREATED', apiId, actorId: developerId },
    });
    expect(event).not.toBeNull();
  });

  it('registra la versión y rechaza al revisor cuando intenta cargar documentos', async () => {
    const version = await request(app.getHttpServer())
      .post(`${PREFIX}/apis/${apiId}/versions`)
      .set('Authorization', `Bearer ${developerToken}`)
      .send({ version: '1.0.0', description: 'Versión QA' });
    expect(version.status).toBe(201);
    versionId = version.body.id as string;
    versionIds.push(versionId);

    const denied = await request(app.getHttpServer())
      .post(`${PREFIX}/versions/${versionId}/documents`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ fileName: 'v1.json', format: 'JSON', content: '{}' });
    expect(denied.status).toBe(403);
  });

  it('rechaza OpenAPI con operaciones HTTP estructuralmente inválidas', async () => {
    const invalid = await request(app.getHttpServer())
      .post(`${PREFIX}/versions/${versionId}/documents`)
      .set('Authorization', `Bearer ${developerToken}`)
      .send({
        fileName: 'invalid.json',
        format: 'JSON',
        content: JSON.stringify({
          openapi: '3.0.3',
          info: { title: 'Invalid', version: '1.0.0' },
          paths: { '/clients': { get: 7 } },
        }),
      });
    expect(invalid.status).toBe(400);
  });

  it('audita el documento, la solicitud y la ejecución vinculadas al usuario', async () => {
    const specification = {
      openapi: '3.0.3',
      info: { title: 'QA', version: '1.0.0', description: 'QA' },
      paths: { '/clients': {
        get: {
          operationId: 'listClients',
          summary: 'Listar clientes',
          description: 'Listado de prueba',
          responses: { '200': { description: 'Respuesta satisfactoria' } },
        },
      } },
    };
    const document = await request(app.getHttpServer())
      .post(`${PREFIX}/versions/${versionId}/documents`)
      .set('Authorization', `Bearer ${developerToken}`)
      .send({
        fileName: 'valid.json',
        format: 'JSON',
        content: JSON.stringify(specification),
      });
    expect(document.status).toBe(201);
    documentId = document.body.id as string;
    documentIds.push(documentId);

    const created = await request(app.getHttpServer())
      .post(`${PREFIX}/documents/${documentId}/evaluations`)
      .set('Authorization', `Bearer ${developerToken}`);
    expect(created.status).toBe(201);
    evaluationId = created.body.id as string;
    executionIds.push(evaluationId);
    expect(created.body.executedBy).toBe(developerId);

    const forbidden = await request(app.getHttpServer())
      .post(`${PREFIX}/evaluations/${evaluationId}/execute`)
      .set('Authorization', `Bearer ${reviewerToken}`);
    expect(forbidden.status).toBe(403);

    const executed = await request(app.getHttpServer())
      .post(`${PREFIX}/evaluations/${evaluationId}/execute`)
      .set('Authorization', `Bearer ${developerToken}`);
    expect(executed.status).toBe(201);
    expect(executed.body.status).toBe('COMPLETED');
    const actions = await prisma.auditEvent.findMany({
      where: { actorId: developerId, entityId: evaluationId },
    });
    expect(actions.map((item) => item.action)).toEqual(
      expect.arrayContaining(['EVALUATION_REQUESTED', 'EVALUATION_COMPLETED']),
    );
  });

  it('expone los eventos auditables solo a usuarios autenticados', async () => {
    const denied = await request(app.getHttpServer())
      .get(`${PREFIX}/audit/activity`);
    expect(denied.status).toBe(401);

    const response = await request(app.getHttpServer())
      .get(`${PREFIX}/audit/activity?page=1&limit=20`)
      .set('Authorization', `Bearer ${developerToken}`);
    expect(response.status).toBe(200);
    expect(response.body.items.some(
      (item: { actor: { id: string } | null }) => item.actor?.id === developerId,
    )).toBe(true);
  });
});
