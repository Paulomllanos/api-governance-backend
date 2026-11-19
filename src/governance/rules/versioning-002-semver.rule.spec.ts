
import { describe, expect, it } from 'vitest';

import type {
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import {
  Versioning002SemverRule,
} from './versioning-002-semver.rule.js';

describe('Versioning002SemverRule', () => {
  const rule = new Versioning002SemverRule();

  function makeSpecification(
    version: unknown,
  ): OpenApiSpecification {
    return {
      openapi: '3.0.3',
      info: {
        title: 'Customer API',
        version,
      },
      paths: {},
    } as unknown as OpenApiSpecification;
  }

  it.each([
    '1.0.0',
    '0.1.0',
    '2.5.13',
    '1.2.0-beta.1',
    '1.2.0-rc.2',
    '1.2.0+build.45',
    '1.2.0-alpha.1+build.001',
    '1.0.0-x-y-z.--',
  ])('aprueba la versión válida %s', (version) => {
    const result = rule.evaluate(
      makeSpecification(version),
    );

    expect(result.status).toBe('PASS');
  });

  it.each([
    '1.2',
    'v1.2.0',
    '01.2.0',
    '1.02.0',
    '1.2.03',
    '1.2.0-',
    '1.2.0-beta.01',
    '1.2.0+',
    '1.2.0-beta..1',
    '1.2.0+build..1',
    '1.2.0 ',
    ' 1.2.0',
    '1.2.0.1',
  ])('rechaza la versión inválida %s', (version) => {
    const result = rule.evaluate(
      makeSpecification(version),
    );

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain(version);
  });

  it('rechaza una versión ausente', () => {
    expect(
      rule.evaluate(makeSpecification(undefined)).status,
    ).toBe('FAIL');
  });

  it('rechaza una versión numérica', () => {
    expect(
      rule.evaluate(makeSpecification(123)).status,
    ).toBe('FAIL');
  });

  it('rechaza una versión vacía', () => {
    expect(
      rule.evaluate(makeSpecification('')).status,
    ).toBe('FAIL');
  });

  it('incluye una recomendación si incumple', () => {
    const result = rule.evaluate(
      makeSpecification('1.2'),
    );

    expect(result.recommendation).toContain(
      'MAJOR.MINOR.PATCH',
    );
  });
});
