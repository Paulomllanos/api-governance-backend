
import { describe, expect, it } from 'vitest';

import {
  GovernanceRuleEngineService,
} from './governance-rule-engine.service.js';

describe('GovernanceRuleEngineService', () => {
  const engine = new GovernanceRuleEngineService();

  const validSpecification = {
    openapi: '3.0.3',
    info: {
      title: 'Customer Management API',
      version: '1.0.0',
    },
    paths: {
      '/customers': {
        get: {
          operationId: 'listCustomers',
          responses: {
            '200': {
              description: 'Listado obtenido',
            },
          },
        },
      },
      '/customers/{customerId}': {
        get: {
          operationId: 'getCustomerById',
          parameters: [
            {
              name: 'customerId',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'Cliente encontrado',
            },
            '404': {
              description: 'Cliente no encontrado',
            },
          },
        },
      },
    },
  };

  it('ejecuta las cuatro reglas registradas', () => {
    const result = engine.execute(validSpecification);

    expect(result.totalRules).toBe(4);
    expect(result.results).toHaveLength(4);
  });

  it('mantiene los identificadores de las reglas', () => {
    const result = engine.execute(validSpecification);

    expect(result.results.map((rule) => rule.ruleId)).toEqual([
      'DESIGN-001',
      'DESIGN-002',
      'DESIGN-003',
      'DESIGN-004',
    ]);
  });

  it('consolida correctamente los resultados', () => {
    const result = engine.execute(validSpecification);

    expect(result.passedRules).toBe(4);
    expect(result.failedRules).toBe(0);
    expect(result.warningRules).toBe(0);
    expect(result.notApplicableRules).toBe(0);
  });

  it('detecta incumplimientos en el documento', () => {
    const result = engine.execute({
      paths: {
        '/Customers': {
          get: {
            responses: {},
          },
        },
      },
    });

    expect(result.failedRules).toBeGreaterThan(0);

    expect(
      result.results.some(
        (rule) =>
          rule.ruleId === 'DESIGN-001' &&
          rule.status === 'FAIL',
      ),
    ).toBe(true);
  });

  it('la suma de resultados coincide con el total', () => {
    const result = engine.execute(validSpecification);

    const total =
      result.passedRules +
      result.failedRules +
      result.warningRules +
      result.notApplicableRules;

    expect(total).toBe(result.totalRules);
  });
});
