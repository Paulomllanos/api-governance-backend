
import { Module } from '@nestjs/common';

import {
  GovernanceRuleEngineService,
} from './governance-rule-engine.service.js';

@Module({
  providers: [GovernanceRuleEngineService],
  exports: [GovernanceRuleEngineService],
})
export class GovernanceModule {}
