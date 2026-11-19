
import { Module } from '@nestjs/common';

import { ApisController } from './apis.controller.js';
import { ApisService } from './apis.service.js';
import {
  AuthorizationModule,
} from '../authorization/authorization.module.js';

@Module({
  imports: [AuthorizationModule],
  controllers: [ApisController],
  providers: [ApisService],
  exports: [ApisService],
})
export class ApisModule {}
