
import { Module } from '@nestjs/common';

import { VersionsController } from './versions.controller.js';
import { VersionsService } from './versions.service.js';

import {
  AuthorizationModule,
} from '../authorization/authorization.module.js';

@Module({
  imports: [
    AuthorizationModule,
  ],

  controllers: [
    VersionsController,
  ],

  providers: [
    VersionsService,
  ],

  exports: [
    VersionsService,
  ],
})
export class VersionsModule {}
