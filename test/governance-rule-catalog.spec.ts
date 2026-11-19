import { describe, expect, it } from 'vitest';
import { GovernanceRulesController } from '../src/governance/governance-rules.controller.js';
import { getGovernanceRules } from '../src/governance/catalog/governance-rules.catalog.js';
import { calculateFinalQualityScore } from '../src/governance/scoring/calculate-final-quality-score.js';

describe('Catálogo público autenticado de reglas de gobierno', () => {
  const rules = new GovernanceRulesController().findAll();
  const engineRules = getGovernanceRules();

  it('expone exactamente las 18 reglas que ejecuta el motor, sin duplicados', () => {
    expect(rules).toHaveLength(18);
    expect(rules.map((rule) => rule.id)).toEqual(engineRules.map((rule) => rule.id));
    expect(new Set(rules.map((rule) => rule.id)).size).toBe(18);
  });

  it('conserva descripción, categoría, severidad y ponderación del motor', () => {
    for (const [index, rule] of rules.entries()) {
      const original = engineRules[index];
      expect(rule).toMatchObject({
        id: original.id,
        code: original.id,
        name: original.name,
        description: original.description,
        category: original.category,
        severity: original.severity,
        weight: original.weight,
        enabled: true,
      });
    }

    expect(new Set(rules.map((rule) => rule.category)).size).toBe(6);
  });

  it('representa como bloqueantes las fallas de severidad alta o crítica', () => {
    for (const rule of rules) {
      const result = calculateFinalQualityScore([
        {
          ruleId: rule.id,
          status: 'FAIL',
          severity: rule.severity,
          weight: rule.weight,
        },
      ]);
      expect(rule.blocking).toBe(result.hasBlockingIssues);
    }
  });
});
