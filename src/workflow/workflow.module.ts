
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

import {
  ReviewQueueController,
} from './review-queue.controller.js';

import {
  ReviewQueueService,
} from './review-queue.service.js';

@Module({
  imports: [
    AuthorizationModule,
  ],

  controllers: [
    WorkflowController,
    ReviewQueueController,
  ],

  providers: [
    WorkflowService,
    ReviewQueueService,
  ],

  exports: [
    WorkflowService,
  ],
})
export class WorkflowModule {}
