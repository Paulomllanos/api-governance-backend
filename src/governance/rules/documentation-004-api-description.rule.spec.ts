
import { describe, expect, it } from 'vitest';

import {
  Documentation004ApiDescriptionRule,
} from './documentation-004-api-description.rule.js';

describe('Documentation004ApiDescriptionRule', () => {
  const rule = new Documentation004ApiDescriptionRule();

  it('aprueba una API con descripción general', () => {
    const result = rule.evaluate({
      openapi: '3.0.3',
      info: {
        title: 'Customer API',
        version: '1.0.0',
        description:
          'API para consultar y administrar clientes.',
      },
      paths: {},
    });

    expect(result.status).toBe('PASS');
  });

  it('detecta la ausencia de info.description', () => {
    const result = rule.evaluate({
      openapi: '3.0.3',
      info: {
        title: 'Customer API',
        version: '1.0.0',
      },
      paths: {},
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('info.description');
  });

  it('rechaza una descripción vacía', () => {
    const result = rule.evaluate({
      openapi: '3.0.3',
      info: {
        title: 'Customer API',
        version: '1.0.0',
        description: '',
      },
      paths: {},
    });

    expect(result.status).toBe('FAIL');
  });

  it('rechaza una descripción con espacios', () => {
    const result = rule.evaluate({
      openapi: '3.1.0',
      info: {
        title: 'Customer API',
        version: '1.0.0',
        description: '   ',
      },
      paths: {},
    });

    expect(result.status).toBe('FAIL');
  });

  it('rechaza un valor que no es texto', () => {
    const result = rule.evaluate({
      openapi: '3.0.3',
      info: {
        title: 'Customer API',
        version: '1.0.0',
        description: 123,
      },
      paths: {},
    });

    expect(result.status).toBe('FAIL');
  });

  it('registra una recomendación ante incumplimientos', () => {
    const result = rule.evaluate({
      openapi: '3.0.3',
      info: {
        title: 'Customer API',
        version: '1.0.0',
      },
      paths: {},
    });

    expect(result.status).toBe('FAIL');
    expect(result.recommendation).toContain(
      'info.description',
    );
  });
});
