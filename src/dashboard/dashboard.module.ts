
import { Module } from '@nestjs/common';

import {
  AuthorizationModule,
} from '../authorization/authorization.module.js';

import {
  DashboardController,
} from './dashboard.controller.js';

import {
  DashboardService,
} from './dashboard.service.js';

@Module({
  imports: [
    AuthorizationModule,
  ],
  controllers: [
    DashboardController,
  ],
  providers: [
    DashboardService,
  ],
})
export class DashboardModule {}
