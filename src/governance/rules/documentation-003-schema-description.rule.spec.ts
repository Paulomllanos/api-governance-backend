
import { describe, expect, it } from 'vitest';

import {
  Documentation003SchemaDescriptionRule,
} from './documentation-003-schema-description.rule.js';

describe('Documentation003SchemaDescriptionRule', () => {
  const rule = new Documentation003SchemaDescriptionRule();

  it('aprueba esquemas y propiedades documentados', () => {
    const result = rule.evaluate({
      paths: {},
      components: {
        schemas: {
          Customer: {
            type: 'object',
            description: 'Representa un cliente.',
            properties: {
              id: {
                type: 'string',
                description: 'Identificador del cliente.',
              },
            },
          },
        },
      },
    });

    expect(result.status).toBe('PASS');
  });

  it('detecta un esquema sin description', () => {
    const result = rule.evaluate({
      paths: {},
      components: {
        schemas: {
          Customer: {
            type: 'object',
            properties: {},
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('Customer');
  });

  it('detecta propiedades sin description', () => {
    const result = rule.evaluate({
      paths: {},
      components: {
        schemas: {
          Customer: {
            description: 'Representa un cliente.',
            properties: {
              email: {
                type: 'string',
              },
            },
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('email');
  });

  it('rechaza descripciones vacías', () => {
    const result = rule.evaluate({
      paths: {},
      components: {
        schemas: {
          Customer: {
            description: ' ',
            properties: {
              id: {
                description: '',
              },
            },
          },
        },
      },
    });

    expect(result.status).toBe('FAIL');
  });

  it('devuelve NOT_APPLICABLE sin esquemas', () => {
    const result = rule.evaluate({
      paths: {},
      components: {},
    });

    expect(result.status).toBe('NOT_APPLICABLE');
  });

  it('advierte ante referencias no evaluadas', () => {
    const result = rule.evaluate({
      paths: {},
      components: {
        schemas: {
          Customer: {
            $ref: '#/components/schemas/Person',
          },
        },
      },
    });

    expect(result.status).toBe('WARNING');
  });

  it('admite esquemas booleanos de OpenAPI 3.1', () => {
    const result = rule.evaluate({
      paths: {},
      components: {
        schemas: {
          AnyValue: true,
        },
      },
    });

    expect(result.status).toBe('NOT_APPLICABLE');
  });
});
