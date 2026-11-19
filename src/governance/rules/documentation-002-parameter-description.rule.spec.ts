
import { describe, expect, it } from 'vitest';

import {
  Documentation002ParameterDescriptionRule,
} from './documentation-002-parameter-description.rule.js';

describe('Documentation002ParameterDescriptionRule', () => {
  const rule = new Documentation002ParameterDescriptionRule();

  it('aprueba parámetros documentados en una operación', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {
            parameters: [
              {
                name: 'limit',
                in: 'query',
                description: 'Cantidad máxima de resultados.',
              },
            ],
          },
        },
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('detecta parámetros sin description', () => {
    const result = rule.evaluate({
      paths: {
        '/customers/{customerId}': {
          get: {
            parameters: [
              {
                name: 'customerId',
                in: 'path',
                required: true,
              },
            ],
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('customerId');
  });

  it('detecta descripciones vacías', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {
            parameters: [
              {
                name: 'search',
                in: 'query',
                description: '   ',
              },
            ],
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
  });

  it('valida parámetros compartidos a nivel de ruta', () => {
    const result = rule.evaluate({
      paths: {
        '/customers/{customerId}': {
          parameters: [
            {
              name: 'customerId',
              in: 'path',
              description: 'Identificador del cliente.',
            },
          ],
          get: {},
        },
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('resuelve parámetros mediante referencias locales', () => {
    const result = rule.evaluate({
      components: {
        parameters: {
          CustomerId: {
            name: 'customerId',
            in: 'path',
            description: 'Identificador del cliente.',
          },
        },
      },
      paths: {
        '/customers/{customerId}': {
          get: {
            parameters: [
              {
                $ref: '#/components/parameters/CustomerId',
              },
            ],
          },
        },
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('advierte cuando una referencia no existe', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {
            parameters: [
              {
                $ref: '#/components/parameters/Unknown',
              },
            ],
          },
        },
      },
    });

    expect(result.status).toBe('WARNING');
  });

  it('detecta referencias circulares', () => {
    const result = rule.evaluate({
      components: {
        parameters: {
          First: {
            $ref: '#/components/parameters/Second',
          },
          Second: {
            $ref: '#/components/parameters/First',
          },
        },
      },
      paths: {
        '/customers': {
          get: {
            parameters: [
              {
                $ref: '#/components/parameters/First',
              },
            ],
          },
        },
      },
    });

    expect(result.status).toBe('WARNING');
  });

  it('devuelve NOT_APPLICABLE cuando no hay parámetros', () => {
    const result = rule.evaluate({
      paths: {
        '/customers': {
          get: {},
        },
      },
    });

    expect(result.status).toBe('NOT_APPLICABLE');
  });
});
