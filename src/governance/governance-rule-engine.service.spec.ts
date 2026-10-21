
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
      description: 'API para consultar y administrar clientes registrados.',
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
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
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },


  };


  it('acepta un contexto de evaluación sin alterar las reglas existentes', () => {
    const context = {
      registeredApiVersion: '1.0.0',
    };

    const withoutContext = engine.execute(
      validSpecification,
    );

    const withContext = engine.execute(
      validSpecification,
      context,
    );

    expect(withContext.totalRules).toBe(
      withoutContext.totalRules,
    );

    const previousRules = (results: typeof withContext.results) =>
      results.filter(
        (rule) => rule.ruleId !== 'VERSIONING-001',
      );

    expect(
      previousRules(withContext.results),
    ).toEqual(
      previousRules(withoutContext.results),
    );

    expect(
      withContext.results.find(
        (rule) => rule.ruleId === 'VERSIONING-001',
      )?.status,
    ).toBe('PASS');

    expect(
      withoutContext.results.find(
        (rule) => rule.ruleId === 'VERSIONING-001',
      )?.status,
    ).toBe('WARNING');


    // VERSIONING-001 cambia de WARNING a PASS
    // cuando recibe una versión coincidente.
    expect(withContext.passedRules).toBe(
      withoutContext.passedRules + 1,
    );

    // Al recibir el contexto desaparece una advertencia.
    expect(withContext.warningRules).toBe(
      withoutContext.warningRules - 1,
    );

    // Las demás clasificaciones no cambian.
    expect(withContext.failedRules).toBe(
      withoutContext.failedRules,
    );

    expect(withContext.notApplicableRules).toBe(
      withoutContext.notApplicableRules,
    );


    expect(withContext.failedRules).toBe(
      withoutContext.failedRules,
    );
  });


  it('ejecuta las cinco reglas registradas', () => {
    const result = engine.execute(validSpecification);

    expect(result.totalRules).toBe(12);
    expect(result.results).toHaveLength(12);
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
      'DOCUMENTATION-003',
      'DOCUMENTATION-004',
      'SECURITY-001',
      'SECURITY-002',
      'SECURITY-003',
      'VERSIONING-001',
    ]);
  });

  it('consolida correctamente los resultados', () => {
    const result = engine.execute(
      validSpecification,
      {
        registeredApiVersion: validSpecification.info.version,
      },
    );


    expect(result.passedRules).toBe(10);
    expect(result.failedRules).toBe(0);
    expect(result.warningRules).toBe(0);
    expect(result.notApplicableRules).toBe(2);

    const documentation002 = result.results.find(
      (rule) => rule.ruleId === 'DOCUMENTATION-002',
    );

    expect(documentation002).toBeDefined();
    expect(documentation002?.status).toBe('PASS');

    const security001 = result.results.find(
      (rule) => rule.ruleId === 'SECURITY-001',
    );

    expect(security001).toBeDefined();
    expect(security001?.status).toBe('PASS');

    const security003 = result.results.find(
      (rule) => rule.ruleId === 'SECURITY-003',
    );

    expect(security003).toBeDefined();
    expect(security003?.status).toBe('NOT_APPLICABLE');




    const versioning001 = result.results.find(
      (rule) => rule.ruleId === 'VERSIONING-001',
    );

    expect(versioning001).toBeDefined();
    expect(versioning001?.status).toBe('PASS');



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
