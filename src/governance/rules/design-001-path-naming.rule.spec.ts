import { describe, expect, it } from 'vitest';
import { Design001PathNamingRule } from './design-001-path-naming.rule.js';

describe('Design001PathNamingRule', () => {
  const rule = new Design001PathNamingRule();

  it('debe aprobar rutas válidas', () => {
    const result = rule.evaluate({
      openapi: '3.0.3',
      paths: {
        '/customers': {},
        '/customer-orders': {},
        '/customers/{customerId}': {},
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('debe rechazar rutas con mayúsculas', () => {
    const result = rule.evaluate({
      paths: {
        '/Customers': {},
      },
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('/Customers');
  });

  it('debe rechazar rutas con guiones bajos', () => {
    const result = rule.evaluate({
      paths: {
        '/customer_orders': {},
      },
    });

    expect(result.status).toBe('FAIL');
  });

  it('debe respetar parámetros de ruta', () => {
    const result = rule.evaluate({
      paths: {
        '/customers/{customerId}': {},
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('debe devolver NOT_APPLICABLE sin rutas', () => {
    const result = rule.evaluate({
      paths: {},
    });

    expect(result.status).toBe('NOT_APPLICABLE');
  });

  it('debe rechazar un objeto paths inválido', () => {
    const result = rule.evaluate({
      paths: null,
    });

    expect(result.status).toBe('FAIL');
  });
});
