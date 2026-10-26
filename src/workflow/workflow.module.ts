
import { Module } from '@nestjs/common';

import {
  AuthorizationModule,
} from '../authorization/authorization.module.js';

import {
  WorkflowController,
} from './workflow.controller.js';

import {
  WorkflowService,
} from './workflow.service.js';

@Module({
  imports: [
    AuthorizationModule,
  ],

  controllers: [
    WorkflowController,
  ],

  providers: [
    WorkflowService,
  ],

  exports: [
    WorkflowService,
  ],
})
export class WorkflowModule {}
