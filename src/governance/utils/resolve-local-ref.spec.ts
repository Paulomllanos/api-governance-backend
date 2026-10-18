
import { describe, expect, it } from 'vitest';

import {
  resolveLocalRef,
} from './resolve-local-ref.js';

describe('resolveLocalRef', () => {
  it('resuelve una referencia local válida', () => {
    const specification = {
      components: {
        parameters: {
          CustomerId: {
            name: 'customerId',
            in: 'path',
            required: true,
          },
        },
      },
    };

    const result = resolveLocalRef(
      '#/components/parameters/CustomerId',
      specification,
    );

    expect(result.status).toBe('RESOLVED');

    if (result.status === 'RESOLVED') {
      expect(result.value.name).toBe('customerId');
    }
  });

  it('rechaza referencias inexistentes', () => {
    const result = resolveLocalRef(
      '#/components/parameters/Unknown',
      { components: { parameters: {} } },
    );

    expect(result.status).toBe('UNRESOLVED');
  });

  it('detecta referencias circulares', () => {
    const result = resolveLocalRef(
      '#/components/parameters/A',
      {
        components: {
          parameters: {
            A: { $ref: '#/components/parameters/B' },
            B: { $ref: '#/components/parameters/A' },
          },
        },
      },
    );

    expect(result.status).toBe('UNRESOLVED');
  });

  it('no sigue referencias externas', () => {
    const result = resolveLocalRef(
      'https://example.com/parameters.yaml',
      {},
    );

    expect(result.status).toBe('UNRESOLVED');
  });

  it('interpreta caracteres escapados de JSON Pointer', () => {
    const result = resolveLocalRef(
      '#/components/parameters/Customer~1Id',
      {
        components: {
          parameters: {
            'Customer/Id': {
              name: 'customerId',
              in: 'path',
              required: true,
            },
          },
        },
      },
    );

    expect(result.status).toBe('RESOLVED');
  });
});
