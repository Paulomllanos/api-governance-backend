
import { Module } from '@nestjs/common';

import { GovernanceModule } from '../governance/governance.module.js';

import {
  EvaluationsController,
} from './evaluations.controller.js';

import {
  EvaluationsService,
} from './evaluations.service.js';

@Module({
  imports: [GovernanceModule],
  controllers: [EvaluationsController],
  providers: [EvaluationsService],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
