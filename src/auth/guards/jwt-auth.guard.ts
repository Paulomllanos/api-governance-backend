
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import type { Request } from 'express';

import { AuthService } from '../auth.service.js';

import type {
  AuthenticatedUser,
} from '../interfaces/authenticated-user.interface.js';

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const authorization = request.headers.authorization;

    if (typeof authorization !== 'string') {
      throw new UnauthorizedException(
        'Token de acceso requerido.',
      );
    }

    const [scheme, token, extra] =
      authorization.split(' ');

    if (
      scheme !== 'Bearer' ||
      !token ||
      extra !== undefined
    ) {
      throw new UnauthorizedException(
        'Formato de autorización inválido.',
      );
    }

    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
      }>(token);

      if (
        !payload ||
        typeof payload.sub !== 'string' ||
        !payload.sub
      ) {
        throw new UnauthorizedException();
      }

      request.user =
        await this.authService.getAuthenticatedUser(
          payload.sub,
        );

      return true;
    } catch {
      throw new UnauthorizedException(
        'Token inválido, expirado o usuario no autorizado.',
      );
    }
  }
}
