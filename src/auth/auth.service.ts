
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import * as argon2 from 'argon2';

import {
  isAppRole,
} from '../authorization/policies/rbac.policy.js';

import { UsersService } from '../users/users.service.js';

import type {
  AuthenticatedUser,
} from './interfaces/authenticated-user.interface.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    // Mensaje genérico para no revelar si el correo existe.
    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Credenciales inválidas.',
      );
    }

    const validPassword = await argon2.verify(
      user.passwordHash,
      password,
    );

    if (!validPassword) {
      throw new UnauthorizedException(
        'Credenciales inválidas.',
      );
    }

    const roles = user.roles
      .map((assignment) => assignment.role.name)
      .filter(isAppRole);

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles,
    };

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      user: authenticatedUser,
    };
  }

  async getAuthenticatedUser(
    userId: string,
  ): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Sesión inválida o usuario desactivado.',
      );
    }

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles
        .map((assignment) => assignment.role.name)
        .filter(isAppRole),
    };
  }
}
