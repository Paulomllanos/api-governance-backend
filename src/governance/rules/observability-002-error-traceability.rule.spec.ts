
import { describe, expect, it } from 'vitest';

import type {
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import {
  Observability002ErrorTraceabilityRule,
} from './observability-002-error-traceability.rule.js';

describe('Observability002ErrorTraceabilityRule', () => {
  const rule = new Observability002ErrorTraceabilityRule();

  const correlationHeader = {
    description: 'Identificador de correlación.',
    schema: { type: 'string' },
  };

  function evaluate(
    paths: Record<string, unknown>,
    components?: Record<string, unknown>,
  ) {
    return rule.evaluate({
      openapi: '3.0.3',
      info: {
        title: 'Customer API',
        version: '1.0.0',
      },
      paths,
      components,
    } as unknown as OpenApiSpecification);
  }

  it('aprueba una respuesta 500 con correlación', () => {
    const result = evaluate({
      '/customers': {
        get: {
          responses: {
            '500': {
              description: 'Error interno',
              headers: {
                'X-Correlation-ID': correlationHeader,
              },
            },
          },
        },
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('detecta ausencia de respuestas de error', () => {
    const result = evaluate({
      '/customers': {
        get: {
          responses: {
            '200': { description: 'OK' },
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('GET /customers');
  });

  it('detecta respuesta de error sin correlación', () => {
    const result = evaluate({
      '/customers': {
        get: {
          responses: {
            '404': {
              description: 'No encontrado',
            },
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('404');
  });

  it('valida todas las respuestas de error', () => {
    const result = evaluate({
      '/customers': {
        get: {
          responses: {
            '400': {
              description: 'Solicitud inválida',
              headers: {
                'X-Correlation-ID': correlationHeader,
              },
            },
            '500': {
              description: 'Error interno',
            },
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('500');
  });

  it('acepta el header sin distinguir mayúsculas', () => {
    const result = evaluate({
      '/customers': {
        get: {
          responses: {
            default: {
              description: 'Error',
              headers: {
                'x-correlation-id': correlationHeader,
              },
            },
          },
        },
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('admite el rango 4XX', () => {
    const result = evaluate({
      '/customers': {
        get: {
          responses: {
            '4XX': {
              description: 'Error del consumidor',
              headers: {
                'X-Correlation-ID': correlationHeader,
              },
            },
          },
        },
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('resuelve responses referenciadas', () => {
    const result = evaluate(
      {
        '/customers': {
          get: {
            responses: {
              '500': {
                $ref: '#/components/responses/ServerError',
              },
            },
          },
        },
      },
      {
        responses: {
          ServerError: {
            description: 'Error interno',
            headers: {
              'X-Correlation-ID': correlationHeader,
            },
          },
        },
      },
    );

    expect(result.status).toBe('PASS');
  });

  it('advierte cuando no puede resolver una respuesta', () => {
    const result = evaluate({
      '/customers': {
        get: {
          responses: {
            '500': {
              $ref: '#/components/responses/Unknown',
            },
          },
        },
      },
    });

    expect(result.status).toBe('WARNING');
  });

  it('detecta un header sin descripción', () => {
    const result = evaluate({
      '/customers': {
        get: {
          responses: {
            '500': {
              description: 'Error interno',
              headers: {
                'X-Correlation-ID': {
                  schema: { type: 'string' },
                },
              },
            },
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
  });

  it('no aplica cuando no existen operaciones', () => {
    const result = evaluate({});

    expect(result.status).toBe('NOT_APPLICABLE');
  });
});
