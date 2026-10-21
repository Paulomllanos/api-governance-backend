
import { describe, expect, it } from 'vitest';

import type {
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import {
  Security002SecuritySchemesRule,
} from './security-002-security-schemes.rule.js';

describe('Security002SecuritySchemesRule', () => {
  const rule = new Security002SecuritySchemesRule();

  function evaluate(
    security: unknown,
    securitySchemes: Record<string, unknown>,
  ) {
    const specification = {
      openapi: '3.0.3',
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
      paths: {
        '/customers': {
          get: {
            responses: {
              '200': { description: 'OK' },
            },
          },
        },
      },
      security,
      components: {
        securitySchemes,
      },
    } as unknown as OpenApiSpecification;

    return rule.evaluate(specification);
  }

  it('aprueba HTTP Bearer correctamente definido', () => {
    const result = evaluate(
      [{ bearerAuth: [] }],
      {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    );

    expect(result.status).toBe('PASS');
  });

  it('detecta un mecanismo inexistente', () => {
    const result = evaluate(
      [{ bearerAuth: [] }],
      {},
    );

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('bearerAuth');
  });

  it('rechaza API Key sin name', () => {
    const result = evaluate(
      [{ apiKeyAuth: [] }],
      {
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
        },
      },
    );

    expect(result.status).toBe('FAIL');
  });

  it('aprueba OAuth2 Client Credentials', () => {
    const result = evaluate(
      [{ oauth2Auth: ['customers.read'] }],
      {
        oauth2Auth: {
          type: 'oauth2',
          flows: {
            clientCredentials: {
              tokenUrl: 'https://auth.example.com/token',
              scopes: {
                'customers.read': 'Consultar clientes',
              },
            },
          },
        },
      },
    );

    expect(result.status).toBe('PASS');
  });

  it('rechaza OAuth2 sin tokenUrl', () => {
    const result = evaluate(
      [{ oauth2Auth: [] }],
      {
        oauth2Auth: {
          type: 'oauth2',
          flows: {
            clientCredentials: {
              scopes: {},
            },
          },
        },
      },
    );

    expect(result.status).toBe('FAIL');
  });

  it('aprueba OpenID Connect', () => {
    const result = evaluate(
      [{ oidcAuth: [] }],
      {
        oidcAuth: {
          type: 'openIdConnect',
          openIdConnectUrl:
            'https://auth.example.com/.well-known/openid-configuration',
        },
      },
    );

    expect(result.status).toBe('PASS');
  });

  it('rechaza scopes sobre HTTP Bearer', () => {
    const result = evaluate(
      [{ bearerAuth: ['customers.read'] }],
      {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
        },
      },
    );

    expect(result.status).toBe('FAIL');
  });

  it('no aplica sin declaraciones de seguridad', () => {
    const result = rule.evaluate({
      paths: {},
    });

    expect(result.status).toBe('NOT_APPLICABLE');
  });
});
