
import { Module } from '@nestjs/common';

import {
  AuthorizationModule,
} from '../authorization/authorization.module.js';

import {
  AuditController,
} from './audit.controller.js';

import {
  AuditService,
} from './audit.service.js';

@Module({
  imports: [
    AuthorizationModule,
  ],

  controllers: [
    AuditController,
  ],

  providers: [
    AuditService,
  ],
})
export class AuditModule {}
