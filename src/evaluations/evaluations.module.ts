
import { Module } from '@nestjs/common';

import { GovernanceModule } from '../governance/governance.module.js';

import {
  EvaluationsController,
} from './evaluations.controller.js';

import {
  EvaluationsService,
} from './evaluations.service.js';

import { AuthorizationModule } from '../authorization/authorization.module.js';

@Module({
  imports: [AuthorizationModule, GovernanceModule],
  controllers: [EvaluationsController],
  providers: [EvaluationsService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
