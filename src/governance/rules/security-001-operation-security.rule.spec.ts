
import { describe, expect, it } from 'vitest';

import {
  Security001OperationSecurityRule,
} from './security-001-operation-security.rule.js';

describe('Security001OperationSecurityRule', () => {
  const rule = new Security001OperationSecurityRule();

  const paths = {
    '/customers': {
      get: {
        responses: {
          '200': {
            description: 'OK',
          },
        },
      },
    },
  };

  it('acepta seguridad global obligatoria', () => {
    const result = rule.evaluate({
      paths,
      security: [{ bearerAuth: [] }],
    });

    expect(result.status).toBe('PASS');
  });

  it('acepta seguridad declarada por operación', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {
            security: [{ apiKeyAuth: [] }],
          },
        },
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('detecta operaciones sin seguridad', () => {
    const result = rule.evaluate({
      paths,
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('GET /customers');
  });

  it('detecta security vacío aunque exista seguridad global', () => {
    const result = rule.evaluate({
      security: [{ bearerAuth: [] }],
      paths: {
        '/customers': {
          get: {
            security: [],
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
  });

  it('detecta una alternativa de acceso anónimo', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {
            security: [
              { bearerAuth: [] },
              {},
            ],
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
  });

  it('permite reemplazar la seguridad global por otra', () => {
    const result = rule.evaluate({
      security: [{ bearerAuth: [] }],
      paths: {
        '/customers': {
          get: {
            security: [{ apiKeyAuth: [] }],
          },
        },
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('rechaza una declaración security inválida', () => {
    const result = rule.evaluate({
      paths,
      security: 'bearerAuth',
    });

    expect(result.status).toBe('FAIL');
  });

  it('no aplica si no hay operaciones HTTP', () => {
    const result = rule.evaluate({
      paths: {},
    });

    expect(result.status).toBe('NOT_APPLICABLE');
  });

  it('advierte ante un Path Item referenciado', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          $ref: '#/components/pathItems/Customers',
        },
      },
    });

    expect(result.status).toBe('WARNING');
  });
});
