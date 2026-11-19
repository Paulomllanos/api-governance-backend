
import { describe, expect, it } from 'vitest';

import type {
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import type {
  GovernanceEvaluationContext,
} from '../interfaces/governance-evaluation-context.interface.js';

import {
  Governance003DocumentTraceabilityRule,
} from './governance-003-document-traceability.rule.js';

describe('Governance003DocumentTraceabilityRule', () => {
  const rule = new Governance003DocumentTraceabilityRule();

  const specification = {
    openapi: '3.0.3',
    info: {
      title: 'Customer API',
      version: '1.0.0',
    },
    paths: {},
  } as OpenApiSpecification;

  const validContext: GovernanceEvaluationContext = {
    documentFileName: 'customer-api.yaml',
    documentUploadedBy: 'system-local',
    documentIsValid: true,
  };

  it('aprueba un documento con metadatos completos', () => {
    const result = rule.evaluate(
      specification,
      validContext,
    );

    expect(result.status).toBe('PASS');
  });

  it('rechaza un nombre de archivo vacío', () => {
    const result = rule.evaluate(specification, {
      ...validContext,
      documentFileName: '',
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('fileName');
  });

  it('rechaza un nombre con solo espacios', () => {
    const result = rule.evaluate(specification, {
      ...validContext,
      documentFileName: '   ',
    });

    expect(result.status).toBe('FAIL');
  });

  it('rechaza uploadedBy vacío', () => {
    const result = rule.evaluate(specification, {
      ...validContext,
      documentUploadedBy: '',
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('uploadedBy');
  });

  it('rechaza una ingesta inválida', () => {
    const result = rule.evaluate(specification, {
      ...validContext,
      documentIsValid: false,
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('isValid');
  });

  it('advierte cuando falta el contexto', () => {
    const result = rule.evaluate(specification);

    expect(result.status).toBe('WARNING');
  });

  it('advierte cuando falta uploadedBy', () => {
    const result = rule.evaluate(specification, {
      documentFileName: 'customer-api.yaml',
      documentIsValid: true,
    });

    expect(result.status).toBe('WARNING');
  });

  it('advierte cuando falta isValid', () => {
    const result = rule.evaluate(specification, {
      documentFileName: 'customer-api.yaml',
      documentUploadedBy: 'system-local',
    });

    expect(result.status).toBe('WARNING');
  });

  it('incluye evidencia de la trazabilidad', () => {
    const result = rule.evaluate(
      specification,
      validContext,
    );

    expect(result.evidence).toContain('customer-api.yaml');
    expect(result.evidence).toContain('system-local');
  });
});
