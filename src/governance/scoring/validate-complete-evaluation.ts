
export interface EvaluationRuleIdentity {
  ruleId: string;
}

export function validateCompleteEvaluation(
  results: readonly EvaluationRuleIdentity[],
  expectedRuleIds: readonly string[],
): void {
  const expectedIds = new Set(expectedRuleIds);
  const receivedIds = new Set(
    results.map((result) => result.ruleId),
  );

  if (
    expectedRuleIds.length !== 18 ||
    expectedIds.size !== 18
  ) {
    throw new Error(
      'El catálogo del MVP debe contener 18 reglas únicas.',
    );
  }

  if (
    results.length !== 18 ||
    receivedIds.size !== 18
  ) {
    throw new Error(
      'La evaluación debe contener 18 resultados únicos.',
    );
  }

  const missing = expectedRuleIds.filter(
    (ruleId) => !receivedIds.has(ruleId),
  );

  const unexpected = results
    .map((result) => result.ruleId)
    .filter((ruleId) => !expectedIds.has(ruleId));

  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      'La evaluación no coincide con el catálogo: ' +
      JSON.stringify({ missing, unexpected }),
    );
  }
}
