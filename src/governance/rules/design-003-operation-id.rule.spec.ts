
import { describe, expect, it } from 'vitest';

import {
  Design003OperationIdRule,
} from './design-003-operation-id.rule.js';

describe('Design003OperationIdRule', () => {
  const rule = new Design003OperationIdRule();

  it('aprueba operaciones con identificadores únicos', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {
            operationId: 'listCustomers',
          },
          post: {
            operationId: 'createCustomer',
          },
        },
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('detecta un operationId duplicado', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {
            operationId: 'manageCustomer',
          },
          post: {
            operationId: 'manageCustomer',
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('duplicado');
  });

  it('detecta una operación sin operationId', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {},
        },
      },
    });

    expect(result.status).toBe('FAIL');
  });

  it('rechaza un operationId vacío', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {
            operationId: '   ',
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
  });

  it('no confunde las propiedades de ruta con operaciones', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          summary: 'Gestión de clientes',
          parameters: [],
          get: {
            operationId: 'listCustomers',
          },
        },
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('devuelve NOT_APPLICABLE sin operaciones', () => {
    const result = rule.evaluate({
      paths: {},
    });

    expect(result.status).toBe('NOT_APPLICABLE');
  });

  it('devuelve WARNING ante Path Items referenciados', () => {
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
