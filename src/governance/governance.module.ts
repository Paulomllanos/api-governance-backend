import { Module } from '@nestjs/common';

import { AuthorizationModule } from '../authorization/authorization.module.js';
import { GovernanceRuleEngineService } from './governance-rule-engine.service.js';
import { GovernanceRulesController } from './governance-rules.controller.js';

@Module({
  imports: [AuthorizationModule],
  controllers: [GovernanceRulesController],
  providers: [GovernanceRuleEngineService],
  exports: [GovernanceRuleEngineService],
})
export class GovernanceModule {}
