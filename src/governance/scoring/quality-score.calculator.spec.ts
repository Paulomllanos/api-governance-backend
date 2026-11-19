
import { describe, expect, it } from 'vitest';

import type {
  GovernanceRuleResult,
} from '../interfaces/governance-result.interface.js';

import {
  calculateQualityScore,
} from './quality-score.calculator.js';

function makeResult(
  ruleId: string,
  status: GovernanceRuleResult['status'],
  weight = 1,
  severity: GovernanceRuleResult['severity'] = 'MEDIUM',
): GovernanceRuleResult {
  return {
    ruleId,
    ruleName: ruleId,
    category: 'DESIGN',
    severity,
    weight,
    status,
    message: 'Resultado de prueba',
  };
}

describe('calculateQualityScore', () => {
  it('calcula 66.67 para los resultados reales de ejemplo', () => {
    const result = calculateQualityScore([
      makeResult('DESIGN-001', 'PASS'),
      makeResult('DESIGN-002', 'NOT_APPLICABLE'),
      makeResult('DESIGN-003', 'FAIL'),
      makeResult('DESIGN-004', 'PASS'),
    ]);

    expect(result.score).toBe(66.67);
    expect(result.applicableRules).toBe(3);
    expect(result.excludedRules).toBe(1);
  });

  it('devuelve 100 cuando todas las reglas aplicables pasan', () => {
    const result = calculateQualityScore([
      makeResult('R1', 'PASS'),
      makeResult('R2', 'PASS'),
    ]);

    expect(result.score).toBe(100);
  });

  it('devuelve cero cuando todas las reglas aplicables fallan', () => {
    const result = calculateQualityScore([
      makeResult('R1', 'FAIL'),
      makeResult('R2', 'FAIL'),
    ]);

    expect(result.score).toBe(0);
  });

  it('otorga medio puntaje a WARNING', () => {
    const result = calculateQualityScore([
      makeResult('R1', 'PASS'),
      makeResult('R2', 'WARNING'),
    ]);

    expect(result.score).toBe(75);
  });

  it('respeta los pesos de las reglas', () => {
    const result = calculateQualityScore([
      makeResult('R1', 'PASS', 3),
      makeResult('R2', 'FAIL', 1),
    ]);

    expect(result.score).toBe(75);
    expect(result.totalWeight).toBe(4);
  });

  it('excluye NOT_APPLICABLE del denominador', () => {
    const result = calculateQualityScore([
      makeResult('R1', 'PASS'),
      makeResult('R2', 'NOT_APPLICABLE', 5),
    ]);

    expect(result.score).toBe(100);
    expect(result.totalWeight).toBe(1);
  });

  it('devuelve null sin reglas aplicables', () => {
    const result = calculateQualityScore([
      makeResult('R1', 'NOT_APPLICABLE'),
    ]);

    expect(result.score).toBeNull();
  });

  it('detecta incumplimientos críticos', () => {
    const result = calculateQualityScore([
      makeResult('R1', 'FAIL', 1, 'CRITICAL'),
      makeResult('R2', 'PASS'),
    ]);

    expect(result.hasCriticalFailures).toBe(true);
  });

  it('no considera bloqueante un incumplimiento HIGH', () => {
    const result = calculateQualityScore([
      makeResult('R1', 'FAIL', 1, 'HIGH'),
    ]);

    expect(result.hasCriticalFailures).toBe(false);
  });

  it('rechaza pesos inválidos', () => {
    expect(() =>
      calculateQualityScore([
        makeResult('R1', 'PASS', 0),
      ]),
    ).toThrow('peso inválido');
  });
});
