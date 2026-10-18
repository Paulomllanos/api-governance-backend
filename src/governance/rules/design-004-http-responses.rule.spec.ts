
import { describe, expect, it } from 'vitest';

import {
  Design004HttpResponsesRule,
} from './design-004-http-responses.rule.js';

describe('Design004HttpResponsesRule', () => {
  const rule = new Design004HttpResponsesRule();

  it('aprueba respuestas HTTP bien documentadas', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {
            responses: {
              '200': { description: 'Operación exitosa' },
              '404': { description: 'Cliente no encontrado' },
            },
          },
        },
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('rechaza operaciones sin responses', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {},
        },
      },
    });

    expect(result.status).toBe('FAIL');
  });

  it('rechaza responses vacío', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: { responses: {} },
        },
      },
    });

    expect(result.status).toBe('FAIL');
  });

  it('detecta códigos HTTP inválidos', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {
            responses: {
              '700': { description: 'Respuesta inválida' },
            },
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('700');
  });

  it('detecta respuestas sin descripción', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          post: {
            responses: {
              '201': {},
            },
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
  });

  it('aprueba una respuesta reutilizada mediante $ref local', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {
            responses: {
              '200': {
                $ref: '#/components/responses/Success',
              },
            },
          },
        },
      },
      components: {
        responses: {
          Success: {
            description: 'Respuesta correcta',
          },
        },
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('advierte cuando una referencia no puede resolverse', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {
            responses: {
              '200': {
                $ref: '#/components/responses/Missing',
              },
            },
          },
        },
      },
    });

    expect(result.status).toBe('WARNING');
  });

  it('acepta la respuesta default', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {
            responses: {
              default: {
                description: 'Respuesta genérica',
              },
            },
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
});
