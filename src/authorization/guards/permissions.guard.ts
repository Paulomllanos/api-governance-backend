
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import type {
  AuthenticatedRequest,
} from '../../auth/guards/jwt-auth.guard.js';

import {
  hasAnyRolePermission,
  type AppPermission,
} from '../policies/rbac.policy.js';

export const PERMISSIONS_KEY =
  'api-governance:required-permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const user = request.user;

    // El JwtAuthGuard debe ejecutarse primero.
    if (!user) {
      throw new UnauthorizedException(
        'Debes iniciar sesión para continuar.',
      );
    }

    const requiredPermissions =
      this.reflector.getAllAndOverride<
        readonly AppPermission[]
      >(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // Denegar si el endpoint no declara permisos.
    if (
      !requiredPermissions ||
      requiredPermissions.length === 0
    ) {
      throw new ForbiddenException(
        'El endpoint no tiene una política de permisos definida.',
      );
    }

    // Se requieren TODOS los permisos declarados.
    const authorized = requiredPermissions.every(
      (permission) =>
        hasAnyRolePermission(
          user.roles,
          permission,
        ),
    );

    if (!authorized) {
      throw new ForbiddenException(
        'No tienes permisos para realizar esta operación.',
      );
    }

    return true;
  }
}
