
import {
  ConflictException,
  Injectable,
} from '@nestjs/common';

import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service.js';

import type { AppRole } from '../authorization/policies/rbac.policy.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * Creación interna.
   *
   * Todavía no se expone como endpoint público.
   * Más adelante solo ADMIN podrá utilizarla.
   */
  async createUser(input: {
    email: string;
    displayName: string;
    password: string;
    roles: AppRole[];
  }) {
    const email = input.email.trim().toLowerCase();
    const displayName = input.displayName.trim();

    if (
      !email ||
      !displayName ||
      input.password.length < 12 ||
      input.password.length > 128 ||
      input.roles.length === 0
    ) {
      throw new ConflictException(
        'Datos de creación de usuario inválidos.',
      );
    }

    const existing = await this.findByEmail(email);

    if (existing) {
      throw new ConflictException(
        'Ya existe un usuario con ese correo.',
      );
    }

    const uniqueRoles = [...new Set(input.roles)];

    const passwordHash = await argon2.hash(
      input.password,
      {
        type: argon2.argon2id,
      },
    );

    return this.prisma.user.create({
      data: {
        email,
        displayName,
        passwordHash,
        roles: {
          create: uniqueRoles.map((name) => ({
            role: {
              connect: { name },
            },
          })),
        },
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true,
        roles: {
          select: {
            role: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }
}
