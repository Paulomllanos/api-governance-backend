
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
          summary: 'Listar clientes',
          description: 'Obtiene los clientes registrados.',
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
          summary: 'Obtiene cliente',
          description: 'Obtiene un cliente por su ID.',
          operationId: 'getCustomerById',
          parameters: [
            {
              name: 'customerId',
              in: 'path',
              required: true,
              description: 'Identificador único del cliente.',
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

  it('ejecuta las cinco reglas registradas', () => {
    const result = engine.execute(validSpecification);

    expect(result.totalRules).toBe(6);
    expect(result.results).toHaveLength(6);
  });

  it('mantiene los identificadores de las reglas', () => {
    const result = engine.execute(validSpecification);

    expect(result.results.map((rule) => rule.ruleId)).toEqual([
      'DESIGN-001',
      'DESIGN-002',
      'DESIGN-003',
      'DESIGN-004',
      'DOCUMENTATION-001',
      'DOCUMENTATION-002',
    ]);
  });

  it('consolida correctamente los resultados', () => {
    const result = engine.execute(validSpecification);


    expect(result.passedRules).toBe(6);
    expect(result.failedRules).toBe(0);
    expect(result.warningRules).toBe(0);
    expect(result.notApplicableRules).toBe(0);

    const documentation002 = result.results.find(
      (rule) => rule.ruleId === 'DOCUMENTATION-002',
    );

    expect(documentation002).toBeDefined();
    expect(documentation002?.status).toBe('PASS');


    console.log('DOCUMENTATION-002:', {
      status: documentation002?.status,
      message: documentation002?.message,
      evidence: documentation002?.evidence,
      recommendation: documentation002?.recommendation,
    });


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
