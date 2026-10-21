
import { describe, expect, it } from 'vitest';

import type {
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import {
  Versioning001VersionConsistencyRule,
} from './versioning-001-version-consistency.rule.js';

describe('Versioning001VersionConsistencyRule', () => {
  const rule = new Versioning001VersionConsistencyRule();

  function specification(
    version: unknown,
  ): OpenApiSpecification {
    return {
      openapi: '3.0.3',
      info: {
        title: 'Customer API',
        version,
      },
      paths: {},
    } as OpenApiSpecification;
  }

  it('aprueba versiones coincidentes', () => {
    const result = rule.evaluate(
      specification('1.2.0'),
      { registeredApiVersion: '1.2.0' },
    );

    expect(result.status).toBe('PASS');
  });

  it('detecta versiones diferentes', () => {
    const result = rule.evaluate(
      specification('1.2.0'),
      { registeredApiVersion: '1.3.0' },
    );

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('1.3.0');
  });

  it('advierte cuando no recibe contexto', () => {
    const result = rule.evaluate(
      specification('1.2.0'),
    );

    expect(result.status).toBe('WARNING');
  });

  it('advierte cuando la versión registrada está vacía', () => {
    const result = rule.evaluate(
      specification('1.2.0'),
      { registeredApiVersion: '' },
    );

    expect(result.status).toBe('WARNING');
  });

  it('falla cuando info.version está vacía', () => {
    const result = rule.evaluate(
      specification(''),
      { registeredApiVersion: '1.2.0' },
    );

    expect(result.status).toBe('FAIL');
  });

  it('falla cuando info.version está ausente', () => {
    const result = rule.evaluate(
      specification(undefined),
      { registeredApiVersion: '1.2.0' },
    );

    expect(result.status).toBe('FAIL');
  });

  it('no normaliza versiones distintas', () => {
    const result = rule.evaluate(
      specification('v1.2.0'),
      { registeredApiVersion: '1.2.0' },
    );

    expect(result.status).toBe('FAIL');
  });
});
