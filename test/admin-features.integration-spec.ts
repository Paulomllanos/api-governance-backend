import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as argon2 from 'argon2';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const PREFIX = '/api/v1';
let app: INestApplication;
let prisma: PrismaService;
let adminId: string;
let developerId: string;
let adminToken: string;
let developerToken: string;
const createdIds: string[] = [];
const password = 'DevTestPassword-47!';
const origin = 'http://localhost:5173';

async function addUser(roleName: 'ADMIN'|'DEVELOPER') {
  const role = await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName } });
  const user = await prisma.user.create({ data: {
    email: `test-${randomUUID()}@example.test`, displayName: `Prueba ${roleName}`,
    passwordHash: await argon2.hash(password), roles: { create: [{ roleId: role.id }] },
  } });
  createdIds.push(user.id);
  return user;
}
async function login(email: string) {
  const response = await request(app.getHttpServer()).post(`${PREFIX}/auth/login`).set('Origin', origin).send({email,password});
  expect(response.status).toBe(201);
  return response.body.accessToken as string;
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL?.includes('api_governance_test')) throw new Error('Por seguridad, ejecutar exclusivamente en api_governance_test.');
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
  await app.init();
  prisma=app.get(PrismaService);
  await prisma.role.upsert({where:{name:'REVIEWER'},update:{},create:{name:'REVIEWER'}});
  const admin = await addUser('ADMIN');
  const developer = await addUser('DEVELOPER');
  adminId=admin.id;developerId=developer.id;
  adminToken=await login(admin.email);developerToken=await login(developer.email);
}, 30000);

afterAll(async()=>{
  if (prisma && createdIds.length) {
    await prisma.notificationRead.deleteMany({where:{userId:{in:createdIds}}});
    await prisma.authSession.deleteMany({where:{userId:{in:createdIds}}});
    await prisma.userRole.deleteMany({where:{userId:{in:createdIds}}});
    await prisma.user.deleteMany({where:{id:{in:createdIds}}});
  }
  if (app) await app.close();
},30000);

describe('7.7.23 — administración, perfil y búsqueda', () => {
  it('ADM-001: rechaza listado sin autenticación',async()=>{
    const r=await request(app.getHttpServer()).get(`${PREFIX}/users`);
    expect(r.status).toBe(401);
  });
  it('ADM-002: rechaza administración desde DEVELOPER',async()=>{
    const r=await request(app.getHttpServer()).get(`${PREFIX}/users`).set('Authorization',`Bearer ${developerToken}`);
    expect(r.status).toBe(403);
  });
  it('ADM-003: ADMIN registra usuario y asigna roles',async()=>{
    const email=`new-${randomUUID()}@example.test`;
    const r=await request(app.getHttpServer()).post(`${PREFIX}/users`).set('Authorization',`Bearer ${adminToken}`).send({email,displayName:'Cuenta QA',password,roles:['DEVELOPER','REVIEWER']});
    expect(r.status).toBe(201);
    expect(r.body).not.toHaveProperty('passwordHash');
    expect(r.body.roles.map((x:{role:{name:string}})=>x.role.name).sort()).toEqual(['DEVELOPER','REVIEWER']);
    createdIds.push(r.body.id as string);
  });
  it('ADM-004: ADMIN cambia roles y desactiva cuentas',async()=>{
    const r=await request(app.getHttpServer()).patch(`${PREFIX}/users/${developerId}`).set('Authorization',`Bearer ${adminToken}`).send({roles:['REVIEWER'],isActive:false});
    expect(r.status).toBe(200);
    expect(r.body.isActive).toBe(false);
    expect(r.body.roles.map((x:{role:{name:string}})=>x.role.name)).toEqual(['REVIEWER']);
    const denied=await request(app.getHttpServer()).get(`${PREFIX}/profile`).set('Authorization',`Bearer ${developerToken}`);
    expect(denied.status).toBe(401);
    const restored=await request(app.getHttpServer()).patch(`${PREFIX}/users/${developerId}`).set('Authorization',`Bearer ${adminToken}`).send({roles:['DEVELOPER'],isActive:true});
    expect(restored.status).toBe(200);
  });
  it('ADM-005: ADMIN no puede quitarse su propio rol',async()=>{
    const r=await request(app.getHttpServer()).patch(`${PREFIX}/users/${adminId}`).set('Authorization',`Bearer ${adminToken}`).send({roles:['DEVELOPER']});
    expect(r.status).toBe(403);
  });
  it('ADM-006: usuario consulta y modifica su perfil',async()=>{
    const r=await request(app.getHttpServer()).patch(`${PREFIX}/profile`).set('Authorization',`Bearer ${developerToken}`).send({displayName:'Desarrollador Actualizado'});
    expect(r.status).toBe(200);
    expect(r.body.displayName).toBe('Desarrollador Actualizado');
    const me=await request(app.getHttpServer()).get(`${PREFIX}/profile`).set('Authorization',`Bearer ${developerToken}`);
    expect(me.body.displayName).toBe('Desarrollador Actualizado');
  });
  it('ADM-007: búsqueda vacía devuelve 400',async()=>{
    const r=await request(app.getHttpServer()).get(`${PREFIX}/search?q=a`).set('Authorization',`Bearer ${developerToken}`);
    expect(r.status).toBe(400);
  });
  it('ADM-008: cambio de correo exige contraseña vigente',async()=>{
    const r=await request(app.getHttpServer()).patch(`${PREFIX}/profile`).set('Authorization',`Bearer ${developerToken}`).send({email:`other-${randomUUID()}@example.test`});
    expect(r.status).toBe(401);
  });
  it('ADM-009: notificación de revisión admite marcado de lectura',async()=>{
    const api=await prisma.api.create({data:{name:`QA ${randomUUID()}`,owner:'QA'}});
    const version=await prisma.apiVersion.create({data:{apiId:api.id,version:'1.0.0',description:'QA'}});
    const transition=await prisma.workflowTransition.create({data:{versionId:version.id,performedById:adminId,fromStatus:'DRAFT',toStatus:'IN_REVIEW'}});
    try{
      const before=await request(app.getHttpServer()).get(`${PREFIX}/notifications`).set('Authorization',`Bearer ${adminToken}`);
      expect(before.status).toBe(200);
      expect(before.body.items.find((n:{id:string})=>n.id===transition.id)?.read).toBe(false);
      const mark=await request(app.getHttpServer()).patch(`${PREFIX}/notifications/${transition.id}/read`).set('Authorization',`Bearer ${adminToken}`);
      expect(mark.status).toBe(200);
      const after=await request(app.getHttpServer()).get(`${PREFIX}/notifications`).set('Authorization',`Bearer ${adminToken}`);
      expect(after.body.items.find((n:{id:string})=>n.id===transition.id)?.read).toBe(true);
    }finally{
      await prisma.notificationRead.deleteMany({where:{transitionId:transition.id}});
      await prisma.workflowTransition.delete({where:{id:transition.id}});
      await prisma.apiVersion.delete({where:{id:version.id}});
      await prisma.api.delete({where:{id:api.id}});
    }
  });
  it('ADM-010: lista de notificaciones protegida',async()=>{
    const denied=await request(app.getHttpServer()).get(`${PREFIX}/notifications`);
    expect(denied.status).toBe(401);
    const allowed=await request(app.getHttpServer()).get(`${PREFIX}/notifications`).set('Authorization',`Bearer ${developerToken}`);
    expect(allowed.status).toBe(200);
    expect(Array.isArray(allowed.body.items)).toBe(true);
  });
});
