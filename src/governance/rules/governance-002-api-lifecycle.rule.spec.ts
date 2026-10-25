
import { describe, expect, it } from 'vitest';

import type {
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import {
  Governance002ApiLifecycleRule,
} from './governance-002-api-lifecycle.rule.js';

describe('Governance002ApiLifecycleRule', () => {
  const rule = new Governance002ApiLifecycleRule();

  const specification = {
    openapi: '3.0.3',
    info: {
      title: 'Customer API',
      version: '1.0.0',
    },
    paths: {},
  } as OpenApiSpecification;

  it.each([
    'DRAFT',
    'ACTIVE',
    'DEPRECATED',
  ])('aprueba el estado válido %s', (status) => {
    const result = rule.evaluate(
      specification,
      { apiLifecycleStatus: status },
    );

    expect(result.status).toBe('PASS');
    expect(result.evidence).toContain(status);
  });

  it.each([
    '',
    'UNKNOWN',
    'PUBLISHED',
    'active',
    ' ACTIVE ',
  ])('rechaza el estado no admitido %s', (status) => {
    const result = rule.evaluate(
      specification,
      { apiLifecycleStatus: status },
    );

    expect(result.status).toBe('FAIL');
    expect(result.recommendation).toContain('ACTIVE');
  });

  it('advierte cuando no se proporciona contexto', () => {
    const result = rule.evaluate(specification);

    expect(result.status).toBe('WARNING');
  });

  it('advierte cuando falta apiLifecycleStatus', () => {
    const result = rule.evaluate(
      specification,
      {
        registeredApiVersion: '1.0.0',
        apiOwner: 'Equipo Integraciones',
      },
    );

    expect(result.status).toBe('WARNING');
  });
});
