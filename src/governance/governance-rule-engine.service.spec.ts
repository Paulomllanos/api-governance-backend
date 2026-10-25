
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
        parameters: [
          {
            name: 'X-Correlation-ID',
            in: 'header',
            required: false,
            description: 'Identificador de correlación.',
            schema: {
              type: 'string',
            },
          },
        ],
        get: {
          summary: 'Listar clientes',
          description: 'Obtiene los clientes registrados.',
          operationId: 'listCustomers',
          responses: {
            '200': {
              description: 'Listado obtenido',
            },
            '500': {
              description: 'Error interno del servicio.',
              headers: {
                'X-Correlation-ID': {
                  description:
                    'Identificador para rastrear la solicitud fallida.',
                  schema: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      },
      '/customers/{customerId}': {
        parameters: [
          {
            name: 'X-Correlation-ID',
            in: 'header',
            required: false,
            description: 'Identificador de correlación.',
            schema: {
              type: 'string',
            },
          },
        ],
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
              headers: {
                'X-Correlation-ID': {
                  description:
                    'Identificador de correlación para rastrear la solicitud.',
                  schema: {
                    type: 'string',
                  },
                },
              },
            },
            '500': {
              description: 'Error interno del servicio.',
              headers: {
                'X-Correlation-ID': {
                  description:
                    'Identificador para rastrear la solicitud fallida.',
                  schema: {
                    type: 'string',
                  },
                },
              },
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
    // Contexto utilizado por VERSIONING-001 y GOVERNANCE-001
    const context = {
      registeredApiVersion: '1.0.0',
      apiOwner: 'Equipo Integraciones',
      apiLifecycleStatus: 'ACTIVE',
      documentFileName: 'customer-api.yaml',
      documentUploadedBy: 'system-local',
      documentIsValid: true,
    };

    // Ejecutar el motor sin contexto
    const withoutContext = engine.execute(
      validSpecification,
    );

    // Ejecutar el motor con contexto
    const withContext = engine.execute(
      validSpecification,
      context,
    );


    // Ambas ejecuciones deben evaluar las mismas reglas
    expect(withContext.totalRules).toBe(18);

    expect(withContext.totalRules).toBe(
      withoutContext.totalRules,
    );

    // Las reglas independientes del contexto
    // deben producir exactamente los mismos resultados.
    const independentRules = (
      results: typeof withContext.results,
    ) =>
      results.filter(
        (rule) =>
          rule.ruleId !== 'VERSIONING-001' &&
          rule.ruleId !== 'GOVERNANCE-001' &&
          rule.ruleId !== 'GOVERNANCE-002' &&
          rule.ruleId !== 'GOVERNANCE-003',
      );

    expect(
      independentRules(withContext.results),
    ).toEqual(
      independentRules(withoutContext.results),
    );


    expect(
      withContext.results.find(
        (rule) => rule.ruleId === 'GOVERNANCE-003',
      )?.status,
    ).toBe('PASS');

    expect(
      withoutContext.results.find(
        (rule) => rule.ruleId === 'GOVERNANCE-003',
      )?.status,
    ).toBe('WARNING');


    expect(
      withContext.results.find(
        (rule) => rule.ruleId === 'GOVERNANCE-002',
      )?.status,
    ).toBe('PASS');

    expect(
      withoutContext.results.find(
        (rule) => rule.ruleId === 'GOVERNANCE-002',
      )?.status,
    ).toBe('WARNING');

    // VERSIONING-001 debe aprobar cuando
    // la versión del contexto coincide.
    const versioningWithContext = withContext.results.find(
      (rule) => rule.ruleId === 'VERSIONING-001',
    );

    expect(versioningWithContext?.status).toBe('PASS');

    // VERSIONING-001 debe advertir si no recibe contexto.
    const versioningWithoutContext = withoutContext.results.find(
      (rule) => rule.ruleId === 'VERSIONING-001',
    );

    expect(versioningWithoutContext?.status).toBe('WARNING');

    // GOVERNANCE-001 debe aprobar cuando
    // la API tiene un responsable asignado.
    const governanceWithContext = withContext.results.find(
      (rule) => rule.ruleId === 'GOVERNANCE-001',
    );

    expect(governanceWithContext?.status).toBe('PASS');

    // GOVERNANCE-001 debe advertir
    // cuando no recibe información del responsable.
    const governanceWithoutContext = withoutContext.results.find(
      (rule) => rule.ruleId === 'GOVERNANCE-001',
    );

    expect(governanceWithoutContext?.status).toBe('WARNING');

    // Con contexto, dos reglas adicionales pasan:
    // VERSIONING-001 y GOVERNANCE-001.
    expect(withContext.passedRules).toBe(
      withoutContext.passedRules + 4,
    );

    // Sin contexto ambas reglas producen WARNING.
    expect(withContext.warningRules).toBe(
      withoutContext.warningRules - 4,
    );

    // No deben cambiar los incumplimientos.
    expect(withContext.failedRules).toBe(
      withoutContext.failedRules,
    );

    // Tampoco deben cambiar las reglas no aplicables.
    expect(withContext.notApplicableRules).toBe(
      withoutContext.notApplicableRules,
    );
  });



  it('ejecuta las cinco reglas registradas', () => {
    const result = engine.execute(validSpecification);

    expect(result.totalRules).toBe(18);
    expect(result.results).toHaveLength(18);
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
      'VERSIONING-002',
      'OBSERVABILITY-001',
      'OBSERVABILITY-002',
      'GOVERNANCE-001',
      'GOVERNANCE-002',
      'GOVERNANCE-003',
    ]);
  });

  it('consolida correctamente los resultados', () => {
    const result = engine.execute(
      validSpecification,
      {
        registeredApiVersion: validSpecification.info.version,
        apiOwner: 'Equipo Integraciones',
        apiLifecycleStatus: 'ACTIVE',
        documentFileName: 'customer-api.yaml',
        documentUploadedBy: 'system-local',
        documentIsValid: true,
      },
    );



    expect(result.passedRules).toBe(16);
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


    const versioning002 = result.results.find(
      (rule) => rule.ruleId === 'VERSIONING-002',
    );

    expect(versioning002).toBeDefined();
    expect(versioning002?.status).toBe('PASS');

    const observability001 = result.results.find(
      (rule) => rule.ruleId === 'OBSERVABILITY-001',
    );

    expect(observability001).toBeDefined();
    expect(observability001?.status).toBe('PASS');

    const observability002 = result.results.find(
      (rule) => rule.ruleId === 'OBSERVABILITY-002',
    );

    expect(observability002).toBeDefined();
    expect(observability002?.status).toBe('PASS');


    console.log('DOCUMENTATION-002:', {
      status: documentation002?.status,
      message: documentation002?.message,
      evidence: documentation002?.evidence,
      recommendation: documentation002?.recommendation,
    });

    const governance001 = result.results.find(
      (rule) => rule.ruleId === 'GOVERNANCE-001',
    );

    expect(governance001).toBeDefined();
    expect(governance001?.status).toBe('PASS');

    const governance002 = result.results.find(
      (rule) => rule.ruleId === 'GOVERNANCE-002',
    );

    expect(governance002).toBeDefined();
    expect(governance002?.status).toBe('PASS');

    const governance003 = result.results.find(
      (rule) => rule.ruleId === 'GOVERNANCE-003',
    );

    expect(governance003).toBeDefined();
    expect(governance003?.status).toBe('PASS');



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
