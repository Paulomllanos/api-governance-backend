
import { describe, expect, it } from 'vitest';

import {
  calculateFinalQualityScore,
  type QualityRuleInput,
} from './calculate-final-quality-score.js';

describe('calculateFinalQualityScore', () => {
  const createRule = (
    overrides: Partial<QualityRuleInput> = {},
  ): QualityRuleInput => ({
    ruleId: 'DESIGN-001',
    status: 'PASS',
    severity: 'LOW',
    weight: 1,
    ...overrides,
  });

  it('devuelve 100 cuando todas las reglas aprueban', () => {
    const result = calculateFinalQualityScore([
      createRule({ ruleId: 'DESIGN-001', weight: 2 }),
      createRule({ ruleId: 'DESIGN-002', weight: 3 }),
    ]);

    expect(result.score).toBe(100);
    expect(result.possiblePoints).toBe(5);
    expect(result.earnedPoints).toBe(5);
    expect(result.hasBlockingIssues).toBe(false);
  });

  it('devuelve 0 cuando todas las reglas fallan', () => {
    const result = calculateFinalQualityScore([
      createRule({
        ruleId: 'DESIGN-001',
        status: 'FAIL',
        weight: 2,
      }),
      createRule({
        ruleId: 'DESIGN-002',
        status: 'FAIL',
        weight: 3,
      }),
    ]);

    expect(result.score).toBe(0);
    expect(result.hasBlockingIssues).toBe(false);
  });

  it('asigna la mitad de los puntos a WARNING', () => {
    const result = calculateFinalQualityScore([
      createRule({
        status: 'WARNING',
        weight: 4,
      }),
    ]);

    expect(result.score).toBe(50);
    expect(result.earnedPoints).toBe(2);
  });

  it('excluye NOT_APPLICABLE del denominador', () => {
    const result = calculateFinalQualityScore([
      createRule({
        ruleId: 'DESIGN-001',
        status: 'PASS',
        weight: 2,
      }),
      createRule({
        ruleId: 'SECURITY-003',
        status: 'NOT_APPLICABLE',
        weight: 10,
      }),
    ]);

    expect(result.score).toBe(100);
    expect(result.possiblePoints).toBe(2);
    expect(result.applicableRules).toBe(1);
    expect(result.excludedRules).toBe(1);
  });

  it('calcula un resultado ponderado', () => {
    const result = calculateFinalQualityScore([
      createRule({
        ruleId: 'DESIGN-001',
        status: 'PASS',
        weight: 2,
      }),
      createRule({
        ruleId: 'SECURITY-001',
        status: 'FAIL',
        severity: 'HIGH',
        weight: 3,
      }),
      createRule({
        ruleId: 'VERSIONING-001',
        status: 'WARNING',
        weight: 1,
      }),
    ]);

    expect(result.score).toBe(41.67);
    expect(result.earnedPoints).toBe(2.5);
    expect(result.possiblePoints).toBe(6);
    expect(result.hasBlockingIssues).toBe(true);
    expect(result.blockingRuleIds).toEqual([
      'SECURITY-001',
    ]);
  });

  it('detecta incumplimientos bloqueantes HIGH', () => {
    const result = calculateFinalQualityScore([
      createRule({
        ruleId: 'SECURITY-001',
        status: 'FAIL',
        severity: 'HIGH',
      }),
    ]);

    expect(result.hasBlockingIssues).toBe(true);
  });

  it('detecta incumplimientos bloqueantes CRITICAL', () => {
    const result = calculateFinalQualityScore([
      createRule({
        ruleId: 'SECURITY-002',
        status: 'FAIL',
        severity: 'CRITICAL',
      }),
    ]);

    expect(result.blockingRuleIds).toContain(
      'SECURITY-002',
    );
  });

  it('no bloquea por una advertencia HIGH', () => {
    const result = calculateFinalQualityScore([
      createRule({
        status: 'WARNING',
        severity: 'HIGH',
      }),
    ]);

    expect(result.hasBlockingIssues).toBe(false);
  });

  it('devuelve null cuando no existen reglas aplicables', () => {
    const result = calculateFinalQualityScore([
      createRule({
        status: 'NOT_APPLICABLE',
      }),
    ]);

    expect(result.score).toBeNull();
    expect(result.possiblePoints).toBe(0);
  });

  it('rechaza pesos negativos o iguales a cero', () => {
    expect(() =>
      calculateFinalQualityScore([
        createRule({ weight: 0 }),
      ]),
    ).toThrow('Peso inválido');

    expect(() =>
      calculateFinalQualityScore([
        createRule({ weight: -1 }),
      ]),
    ).toThrow('Peso inválido');
  });

  it('no modifica los resultados recibidos', () => {
    const rules: QualityRuleInput[] = [
      createRule({ ruleId: 'DESIGN-001' }),
    ];

    const previous = structuredClone(rules);

    calculateFinalQualityScore(rules);

    expect(rules).toEqual(previous);
  });
});
