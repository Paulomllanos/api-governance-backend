
import { Module } from '@nestjs/common';

import {
  AuthorizationModule,
} from '../authorization/authorization.module.js';

import {
  FindingsController,
} from './findings.controller.js';

import {
  FindingsService,
} from './findings.service.js';

@Module({
  imports: [AuthorizationModule],
  controllers: [FindingsController],
  providers: [FindingsService],
})
export class FindingsModule {}
