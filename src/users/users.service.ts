import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { APP_ROLES, type AppRole } from '../authorization/policies/rbac.policy.js';

const publicSelect = {
  id: true, email: true, displayName: true, isActive: true, createdAt: true, updatedAt: true,
  roles: { select: { role: { select: { name: true } } } },
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, include: { roles: { include: { role: true } } } });
  }
  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } });
  }
  listManaged() {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, select: publicSelect });
  }
  // Compatibilidad con el controlador de usuarios de una etapa anterior.
  findAll() { return this.listManaged(); }
  getPublicProfile(id: string) {
    return this.prisma.user.findUniqueOrThrow({ where: { id }, select: publicSelect });
  }

  async createUser(input: { email: string; displayName: string; password: string; roles: AppRole[] }, actorId?: string) {
    const email = input.email.trim().toLowerCase();
    const displayName = input.displayName.trim();
    if (!email || displayName.length < 2 || input.password.length < 12 || input.password.length > 128 || input.roles.length === 0 || input.roles.some(r => !APP_ROLES.includes(r))) {
      throw new BadRequestException('Datos de usuario inválidos.');
    }
    const uniqueRoles = [...new Set(input.roles)];
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    try {
      return await this.prisma.$transaction(async tx => {
        const user = await tx.user.create({
          data: { email, displayName, passwordHash, roles: { create: uniqueRoles.map(name => ({ role: { connect: { name } } })) } },
          select: publicSelect,
        });
        await tx.auditEvent.create({
          data: {
            actorId: actorId ?? null,
            action: 'USER_CREATED',
            entityType: 'USER',
            entityId: user.id,
            detail: { roles: uniqueRoles },
          },
        });
        return user;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Ya existe un usuario con ese correo.');
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw new BadRequestException('Los roles solicitados no están registrados.');
      throw error;
    }
  }

  async updateManaged(id: string, input: { roles?: AppRole[]; isActive?: boolean }, actorId: string) {
    if (input.roles === undefined && input.isActive === undefined) throw new BadRequestException('No se indicaron cambios.');
    if (input.roles && (input.roles.length === 0 || input.roles.some(r => !APP_ROLES.includes(r)))) throw new BadRequestException('Roles inválidos.');
    if (id === actorId && (input.isActive === false || (input.roles && !input.roles.includes('ADMIN')))) {
      throw new ForbiddenException('No puedes desactivar tu cuenta o quitarte el rol administrador.');
    }
    try {
      return await this.prisma.$transaction(async tx => {
        // Serializa cambios administrativos que podrían dejar la plataforma sin administradores.
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(712378201)::text AS lock`;
        const existing = await tx.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } });
        if (!existing) throw new NotFoundException('Usuario no encontrado.');
        const hadAdmin = existing.isActive && existing.roles.some(r => r.role.name === 'ADMIN');
        const willBeAdmin = (input.isActive ?? existing.isActive) && (input.roles ?? existing.roles.map(r => r.role.name)).includes('ADMIN');
        if (hadAdmin && !willBeAdmin) {
          const admins = await tx.user.count({ where: { isActive: true, roles: { some: { role: { name: 'ADMIN' } } } } });
          if (admins <= 1) throw new ConflictException('No puedes dejar la plataforma sin administradores activos.');
        }
        if (input.roles) {
          // Reemplazo de roles por IDs reales de la tabla Role.
          const roles = await tx.role.findMany({ where: { name: { in: input.roles } }, select: { id: true } });
          if (roles.length !== input.roles.length) throw new BadRequestException('Debes registrar los roles base antes de administrar usuarios.');
          await tx.userRole.deleteMany({ where: { userId: id } });
          await tx.userRole.createMany({ data: roles.map(role => ({ userId: id, roleId: role.id })) });
        }
        if (input.isActive !== undefined) {
          await tx.user.update({ where: { id }, data: { isActive: input.isActive } });
          if (!input.isActive) await tx.authSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
        }
        await tx.auditEvent.create({
          data: {
            actorId,
            action: 'USER_ADMIN_UPDATED',
            entityType: 'USER',
            entityId: id,
            detail: {
              rolesChanged: input.roles !== undefined,
              activeStateChanged: input.isActive !== undefined,
              ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
            },
          },
        });
        return tx.user.findUniqueOrThrow({ where: { id }, select: publicSelect });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2034' || (error.code === 'P2010' && error.meta?.code === '40001'))) throw new ConflictException('Otro administrador modificó estos datos simultáneamente. Reintenta.');
      throw error;
    }
  }

  async updateProfile(id: string, input: { displayName?: string; email?: string; currentPassword?: string }) {
    if (input.displayName === undefined && input.email === undefined) throw new BadRequestException('No se indicaron cambios.');
    const user = await this.findById(id);
    if (!user || !user.isActive) throw new NotFoundException('Usuario no encontrado.');
    const email = input.email?.trim().toLowerCase();
    const name = input.displayName?.trim();
    if (name !== undefined && (name.length < 2 || name.length > 100)) throw new BadRequestException('Nombre inválido.');
    if (email !== undefined && email !== user.email) {
      if (!input.currentPassword || !(await argon2.verify(user.passwordHash, input.currentPassword))) throw new UnauthorizedException('Se requiere la contraseña actual para cambiar el correo.');
    }
    try {
      return await this.prisma.$transaction(async tx => {
        const updated = await tx.user.update({
          where: { id },
          data: { ...(name !== undefined ? { displayName: name } : {}), ...(email !== undefined ? { email } : {}) },
          select: publicSelect,
        });
        await tx.auditEvent.create({
          data: {
            actorId: id,
            action: 'PROFILE_UPDATED',
            entityType: 'USER',
            entityId: id,
            detail: { fields: [name !== undefined ? 'displayName' : null, email !== undefined ? 'email' : null].filter(Boolean) },
          },
        });
        return updated;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Correo ya registrado.');
      throw error;
    }
  }

  async changePassword(id: string, input: { currentPassword: string; newPassword: string }) {
    const user = await this.findById(id);
    if (!user?.isActive) throw new NotFoundException('Usuario no encontrado.');
    if (!(await argon2.verify(user.passwordHash, input.currentPassword))) throw new UnauthorizedException('Contraseña actual incorrecta.');
    if (input.currentPassword === input.newPassword) throw new BadRequestException('La nueva contraseña debe ser diferente.');
    const hash = await argon2.hash(input.newPassword, { type: argon2.argon2id });
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: { passwordHash: hash } }),
      this.prisma.authSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.auditEvent.create({
        data: {
          actorId: id,
          action: 'PASSWORD_CHANGED',
          entityType: 'USER',
          entityId: id,
        },
      }),
    ]);
    return { message: 'Contraseña actualizada. Inicia sesión nuevamente.' };
  }
}
