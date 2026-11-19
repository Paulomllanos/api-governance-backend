#!/usr/bin/env node
/**
 * Compara una pauta manual independiente con los resultados del MVP.
 * No genera ni presupone resultados de investigación.
 *
 * Uso: node scripts/compare-manual.mjs ruta/a/mediciones.json
 */
import { readFileSync } from 'node:fs';

const source = process.argv[2];
if (!source) {
  console.error('Uso: node scripts/compare-manual.mjs mediciones.json');
  process.exit(1);
}

let entries;
try {
  entries = JSON.parse(readFileSync(source, 'utf8'));
} catch (error) {
  console.error('No se pudo leer la pauta JSON:', error.message);
  process.exit(1);
}
if (!Array.isArray(entries) || entries.length === 0) {
  console.error('La pauta requiere un arreglo no vacío de casos.');
  process.exit(1);
}

const total = { manualMs: 0, automatedMs: 0, tp: 0, fp: 0, fn: 0, concordance: 0 };
const seen = new Set();
const cases = [];

for (const entry of entries) {
  const { caseId, manualMs, automatedMs, expectedFindings, actualFindings } = entry ?? {};
  if (
    typeof caseId !== 'string' || !caseId.trim() || seen.has(caseId) ||
    typeof manualMs !== 'number' || !Number.isFinite(manualMs) || manualMs <= 0 ||
    typeof automatedMs !== 'number' || !Number.isFinite(automatedMs) || automatedMs < 0 ||
    !Array.isArray(expectedFindings) || !Array.isArray(actualFindings) ||
    [...expectedFindings, ...actualFindings].some((id) => typeof id !== 'string' || !id.trim())
  ) {
    console.error('Caso inválido, repetido o con duración no válida:', caseId);
    process.exit(1);
  }

  seen.add(caseId);
  const expected = new Set(expectedFindings);
  const actual = new Set(actualFindings);
  if (expected.size !== expectedFindings.length || actual.size !== actualFindings.length) {
    console.error('No se permiten hallazgos duplicados en el caso:', caseId);
    process.exit(1);
  }
  const tp = [...actual].filter((id) => expected.has(id)).length;
  const fp = actual.size - tp;
  const fn = expected.size - tp;
  const concordance = tp + fp + fn === 0 ? 1 : tp / (tp + fp + fn);

  total.manualMs += manualMs;
  total.automatedMs += automatedMs;
  total.tp += tp;
  total.fp += fp;
  total.fn += fn;
  total.concordance += concordance;

  cases.push({
    caseId,
    manualMs,
    automatedMs,
    reductionPercent: Number(((manualMs - automatedMs) / manualMs * 100).toFixed(2)),
    truePositives: tp,
    falsePositives: fp,
    falseNegatives: fn,
    concordancePercent: Number((concordance * 100).toFixed(2)),
  });
}

const fraction = (numerator, denominator, emptyValue = 1) =>
  denominator === 0 ? emptyValue : numerator / denominator;

const report = {
  cases: entries.length,
  manualTotalMs: total.manualMs,
  automatedTotalMs: total.automatedMs,
  timeReductionPercent: Number(((total.manualMs - total.automatedMs) / total.manualMs * 100).toFixed(2)),
  precisionPercent: Number((fraction(total.tp, total.tp + total.fp, 0) * 100).toFixed(2)),
  recallPercent: Number((fraction(total.tp, total.tp + total.fn, 1) * 100).toFixed(2)),
  meanConcordancePercent: Number((total.concordance / entries.length * 100).toFixed(2)),
  truePositives: total.tp,
  falsePositives: total.fp,
  falseNegatives: total.fn,
  byCase: cases,
};

console.log(JSON.stringify(report, null, 2));
