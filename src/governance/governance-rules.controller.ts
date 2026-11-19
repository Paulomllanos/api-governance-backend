import { Controller, Get } from '@nestjs/common';

import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator.js';
import { getGovernanceRules } from './catalog/governance-rules.catalog.js';

/**
 * El motor NestJS es la única fuente de verdad del catálogo de reglas.
 * No exponemos funciones evaluate ni mantenemos una copia estática en React.
 */
@Controller('governance/rules')
export class GovernanceRulesController {
  @Get()
  @RequirePermissions('evaluations:read')
  findAll() {
    return getGovernanceRules().map((rule) => ({
      id: rule.id,
      code: rule.id,
      name: rule.name,
      description: rule.description,
      category: rule.category,
      severity: rule.severity,
      weight: rule.weight,
      enabled: true,
      // calculateFinalQualityScore bloquea ante fallas HIGH o CRITICAL.
      blocking:
        rule.severity === 'HIGH' ||
        rule.severity === 'CRITICAL',
    }));
  }
}
