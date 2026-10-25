
import {
  applyDecorators,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';

import {
  JwtAuthGuard,
} from '../../auth/guards/jwt-auth.guard.js';

import {
  PermissionsGuard,
  PERMISSIONS_KEY,
} from '../guards/permissions.guard.js';

import type {
  AppPermission,
} from '../policies/rbac.policy.js';

export function RequirePermissions(
  ...permissions: [
    AppPermission,
    ...AppPermission[],
  ]
) {
  return applyDecorators(
    SetMetadata(PERMISSIONS_KEY, permissions),
    UseGuards(
      JwtAuthGuard,
      PermissionsGuard,
    ),
  );
}
