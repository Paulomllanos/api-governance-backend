
import { describe, expect, it } from 'vitest';

import {
  Documentation001OperationDescriptionRule,
} from './documentation-001-operation-description.rule.js';

describe('Documentation001OperationDescriptionRule', () => {
  const rule = new Documentation001OperationDescriptionRule();

  it('aprueba operaciones bien documentadas', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {
            summary: 'Listar clientes',
            description: 'Obtiene los clientes registrados.',
          },
        },
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('detecta una operación sin summary', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {
            description: 'Obtiene los clientes registrados.',
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('summary');
  });

  it('detecta una operación sin description', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          post: {
            summary: 'Crear cliente',
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('description');
  });

  it('rechaza campos que contienen solamente espacios', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {
            summary: '   ',
            description: '',
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
  });

  it('evalúa todas las operaciones de una ruta', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {
            summary: 'Listar clientes',
            description: 'Consulta los clientes.',
          },
          post: {
            summary: 'Crear cliente',
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('POST /customers');
  });

  it('no considera parameters como una operación HTTP', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          parameters: [],
          get: {
            summary: 'Listar clientes',
            description: 'Consulta los clientes.',
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

  it('advierte ante Path Items referenciados', () => {
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
