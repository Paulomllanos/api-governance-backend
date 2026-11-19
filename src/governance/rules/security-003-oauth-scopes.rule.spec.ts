
import { describe, expect, it } from 'vitest';

import type {
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import {
  Security003OAuthScopesRule,
} from './security-003-oauth-scopes.rule.js';

describe('Security003OAuthScopesRule', () => {
  const rule = new Security003OAuthScopesRule();

  function buildSpecification(
    requestedScopes: string[],
    declaredScopes: Record<string, string>,
  ): OpenApiSpecification {
    return {
      openapi: '3.0.3',
      info: {
        title: 'Customer API',
        version: '1.0.0',
      },
      security: [
        {
          oauth2Auth: requestedScopes,
        },
      ],
      components: {
        securitySchemes: {
          oauth2Auth: {
            type: 'oauth2',
            flows: {
              clientCredentials: {
                tokenUrl: 'https://auth.example.com/token',
                scopes: declaredScopes,
              },
            },
          },
        },
      },
      paths: {
        '/customers': {
          get: {
            responses: {
              '200': {
                description: 'OK',
              },
            },
          },
        },
      },
    } as OpenApiSpecification;
  }

  it('aprueba scopes correctamente declarados', () => {
    const specification = buildSpecification(
      ['customers.read'],
      {
        'customers.read': 'Consultar clientes',
      },
    );

    const result = rule.evaluate(specification);

    expect(result.status).toBe('PASS');
  });

  it('detecta un scope inexistente', () => {
    const specification = buildSpecification(
      ['customers.read'],
      {
        'customers.write': 'Crear clientes',
      },
    );

    const result = rule.evaluate(specification);

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('customers.read');
  });

  it('aprueba múltiples scopes existentes', () => {
    const specification = buildSpecification(
      ['customers.read', 'customers.write'],
      {
        'customers.read': 'Consultar clientes',
        'customers.write': 'Crear clientes',
      },
    );

    expect(rule.evaluate(specification).status).toBe('PASS');
  });

  it('admite un requisito OAuth2 sin scopes', () => {
    const specification = buildSpecification(
      [],
      {
        'customers.read': 'Consultar clientes',
      },
    );

    expect(rule.evaluate(specification).status).toBe('PASS');
  });

  it('respeta la seguridad definida por operación', () => {
    const specification = buildSpecification(
      ['customers.missing'],
      {
        'customers.read': 'Consultar clientes',
      },
    );

    specification.paths = {
      '/customers': {
        get: {
          security: [
            {
              oauth2Auth: ['customers.read'],
            },
          ],
        },
      },
    };

    expect(rule.evaluate(specification).status).toBe('PASS');
  });

  it('no aplica cuando se utiliza HTTP Bearer', () => {
    const specification = {
      openapi: '3.0.3',
      info: {
        title: 'Customer API',
        version: '1.0.0',
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
          },
        },
      },
      paths: {
        '/customers': {
          get: {},
        },
      },
    } as OpenApiSpecification;

    expect(rule.evaluate(specification).status).toBe(
      'NOT_APPLICABLE',
    );
  });

  it('no aplica cuando la operación es pública', () => {
    const specification = buildSpecification(
      ['customers.missing'],
      {},
    );

    specification.paths = {
      '/health': {
        get: {
          security: [],
        },
      },
    };

    expect(rule.evaluate(specification).status).toBe(
      'NOT_APPLICABLE',
    );
  });

  it('detecta scopes inválidos', () => {
    const specification = buildSpecification(
      ['customers.read'],
      {
        'customers.read': 'Consultar clientes',
      },
    );

    specification.security = [
      {
        oauth2Auth: [123],
      },
    ] as unknown as OpenApiSpecification['security'];

    expect(rule.evaluate(specification).status).toBe('FAIL');
  });

  it('advierte ante un Path Item referenciado', () => {
    const specification = buildSpecification(
      [],
      {},
    );

    specification.paths = {
      '/customers': {
        $ref: '#/components/pathItems/Customers',
      },
    };

    expect(rule.evaluate(specification).status).toBe('WARNING');
  });
});
