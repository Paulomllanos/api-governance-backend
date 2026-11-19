
import { describe, expect, it } from 'vitest';

import {
  validateCompleteEvaluation,
} from './validate-complete-evaluation.js';

describe('validateCompleteEvaluation', () => {
  const expectedRuleIds = Array.from(
    { length: 18 },
    (_, index) =>
      `RULE-${String(index + 1).padStart(3, '0')}`,
  );

  const validResults = expectedRuleIds.map(
    (ruleId) => ({ ruleId }),
  );

  it('acepta 18 resultados únicos del catálogo', () => {
    expect(() =>
      validateCompleteEvaluation(
        validResults,
        expectedRuleIds,
      ),
    ).not.toThrow();
  });

  it('rechaza una evaluación incompleta', () => {
    expect(() =>
      validateCompleteEvaluation(
        validResults.slice(0, 17),
        expectedRuleIds,
      ),
    ).toThrow('18 resultados únicos');
  });

  it('rechaza resultados duplicados', () => {
    const duplicated = [
      ...validResults.slice(0, 17),
      { ruleId: expectedRuleIds[0] },
    ];

    expect(() =>
      validateCompleteEvaluation(
        duplicated,
        expectedRuleIds,
      ),
    ).toThrow('18 resultados únicos');
  });

  it('rechaza una regla desconocida', () => {
    const unknownRule = [
      ...validResults.slice(0, 17),
      { ruleId: 'UNKNOWN-999' },
    ];

    expect(() =>
      validateCompleteEvaluation(
        unknownRule,
        expectedRuleIds,
      ),
    ).toThrow('no coincide con el catálogo');
  });

  it('rechaza un catálogo incompleto', () => {
    expect(() =>
      validateCompleteEvaluation(
        validResults,
        expectedRuleIds.slice(0, 17),
      ),
    ).toThrow('18 reglas únicas');
  });

  it('no depende del orden de las reglas', () => {
    expect(() =>
      validateCompleteEvaluation(
        [...validResults].reverse(),
        expectedRuleIds,
      ),
    ).not.toThrow();
  });
});
