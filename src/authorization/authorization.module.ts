
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';

import {
  PermissionsGuard,
} from './guards/permissions.guard.js';

@Module({
  imports: [
    AuthModule,
  ],

  providers: [
    PermissionsGuard,
  ],

  exports: [
    AuthModule,
    PermissionsGuard,
  ],
})
export class AuthorizationModule {}
