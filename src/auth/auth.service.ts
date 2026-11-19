
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

import {
  AuthSessionsService,
} from './auth-sessions.service.js';

import type {
  AuthenticatedUser,
} from './interfaces/authenticated-user.interface.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly authSessionsService: AuthSessionsService,
  ) {}

  private async issueAccessToken(userId: string) {
    return this.jwtService.signAsync({
      sub: userId,
    });
  }

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

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

    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      roles: user.roles
        .map((assignment) => assignment.role.name)
        .filter(isAppRole),
    };

    const accessToken = await this.issueAccessToken(user.id);

    const session =
      await this.authSessionsService.createSession(user.id);

    // El controlador enviará el refresh token
    // únicamente mediante una cookie HttpOnly.
    return {
      response: {
        accessToken,
        tokenType: 'Bearer' as const,
        expiresIn: 900,
        user: authenticatedUser,
      },
      refreshToken: session.refreshToken,
      refreshExpiresAt: session.expiresAt,
    };
  }

  async refresh(refreshToken: string) {
    const session =
      await this.authSessionsService.rotateSession(refreshToken);

    const user = await this.getAuthenticatedUser(
      session.userId,
    );

    const accessToken = await this.issueAccessToken(
      user.id,
    );

    return {
      response: {
        accessToken,
        tokenType: 'Bearer' as const,
        expiresIn: 900,
        user,
      },
      refreshToken: session.refreshToken,
      refreshExpiresAt: session.expiresAt,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.authSessionsService.revokeSession(
      refreshToken,
    );
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
