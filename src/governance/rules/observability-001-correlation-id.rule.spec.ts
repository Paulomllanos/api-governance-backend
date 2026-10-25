
import { describe, expect, it } from 'vitest';

import type {
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import {
  Observability001CorrelationIdRule,
} from './observability-001-correlation-id.rule.js';

describe('Observability001CorrelationIdRule', () => {
  const rule = new Observability001CorrelationIdRule();

  function evaluate(
    paths: Record<string, unknown>,
    components?: Record<string, unknown>,
  ) {
    const specification = {
      openapi: '3.0.3',
      info: {
        title: 'Customer API',
        version: '1.0.0',
      },
      paths,
      components,
    } as unknown as OpenApiSpecification;

    return rule.evaluate(specification);
  }

  it('aprueba una cabecera definida en la operación', () => {
    const result = evaluate({
      '/customers': {
        get: {
          parameters: [
            {
              name: 'X-Correlation-ID',
              in: 'header',
              description: 'Identificador de correlación.',
              schema: { type: 'string' },
            },
          ],
        },
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('aprueba una cabecera compartida a nivel de ruta', () => {
    const result = evaluate({
      '/customers': {
        parameters: [
          {
            name: 'X-Correlation-ID',
            in: 'header',
          },
        ],
        get: {},
        post: {},
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('detecta una operación sin cabecera de correlación', () => {
    const result = evaluate({
      '/customers': {
        get: {},
      },
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('GET /customers');
  });

  it('no acepta un parámetro query con el mismo nombre', () => {
    const result = evaluate({
      '/customers': {
        get: {
          parameters: [
            {
              name: 'X-Correlation-ID',
              in: 'query',
            },
          ],
        },
      },
    });

    expect(result.status).toBe('FAIL');
  });

  it('ignora diferencias entre mayúsculas y minúsculas', () => {
    const result = evaluate({
      '/customers': {
        get: {
          parameters: [
            {
              name: 'x-correlation-id',
              in: 'header',
            },
          ],
        },
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('resuelve referencias a components.parameters', () => {
    const result = evaluate(
      {
        '/customers': {
          get: {
            parameters: [
              {
                $ref: '#/components/parameters/CorrelationId',
              },
            ],
          },
        },
      },
      {
        parameters: {
          CorrelationId: {
            name: 'X-Correlation-ID',
            in: 'header',
            description: 'Identificador de correlación.',
          },
        },
      },
    );

    expect(result.status).toBe('PASS');
  });

  it('advierte si no puede resolver un parámetro', () => {
    const result = evaluate({
      '/customers': {
        get: {
          parameters: [
            {
              $ref: '#/components/parameters/Unknown',
            },
          ],
        },
      },
    });

    expect(result.status).toBe('WARNING');
  });

  it('detecta operaciones parcialmente documentadas', () => {
    const result = evaluate({
      '/customers': {
        get: {
          parameters: [
            {
              name: 'X-Correlation-ID',
              in: 'header',
            },
          ],
        },
        post: {},
      },
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('POST /customers');
  });

  it('devuelve NOT_APPLICABLE si no hay operaciones', () => {
    const result = evaluate({});

    expect(result.status).toBe('NOT_APPLICABLE');
  });
});
