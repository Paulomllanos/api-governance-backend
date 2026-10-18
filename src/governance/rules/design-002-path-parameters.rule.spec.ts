
import { describe, expect, it } from 'vitest';

import { Design002PathParametersRule } from './design-002-path-parameters.rule.js';

describe('Design002PathParametersRule', () => {
    const rule = new Design002PathParametersRule();

    it('aprueba un parámetro correctamente declarado', () => {
        const result = rule.evaluate({
            paths: {
                '/customers/{customerId}': {
                    get: {
                        parameters: [
                            {
                                name: 'customerId',
                                in: 'path',
                                required: true,
                            },
                        ],
                    },
                },
            },
        });

        expect(result.status).toBe('PASS');
    });

    it('detecta parámetros no declarados', () => {
        const result = rule.evaluate({
            paths: {
                '/customers/{customerId}': {
                    get: {
                        parameters: [],
                    },
                },
            },
        });

        expect(result.status).toBe('FAIL');
        expect(result.evidence).toContain('customerId');
    });

    it('rechaza parámetros de ruta no obligatorios', () => {
        const result = rule.evaluate({
            paths: {
                '/customers/{customerId}': {
                    get: {
                        parameters: [
                            {
                                name: 'customerId',
                                in: 'path',
                                required: false,
                            },
                        ],
                    },
                },
            },
        });

        expect(result.status).toBe('FAIL');
    });

    it('reconoce parámetros declarados a nivel de ruta', () => {
        const result = rule.evaluate({
            paths: {
                '/customers/{customerId}': {
                    parameters: [
                        {
                            name: 'customerId',
                            in: 'path',
                            required: true,
                        },
                    ],
                    get: {},
                },
            },
        });

        expect(result.status).toBe('PASS');
    });

    it('devuelve NOT_APPLICABLE cuando no existen parámetros de ruta', () => {
        const result = rule.evaluate({
            paths: {
                '/customers': {
                    get: {},
                },
            },
        });

        expect(result.status).toBe('NOT_APPLICABLE');
    });

    it('devuelve WARNING cuando encuentra referencias sin resolver', () => {
        const result = rule.evaluate({
            paths: {
                '/customers/{customerId}': {
                    get: {
                        parameters: [
                            {
                                $ref: '#/components/parameters/customerId',
                            },
                        ],
                    },
                },
            },
        });

        expect(result.status).toBe('WARNING');
    });


    it('aprueba un parámetro declarado mediante $ref local', () => {
        const result = rule.evaluate({
            paths: {
                '/customers/{customerId}': {
                    get: {
                        parameters: [
                            {
                                $ref: '#/components/parameters/CustomerId',
                            },
                        ],
                    },
                },
            },
            components: {
                parameters: {
                    CustomerId: {
                        name: 'customerId',
                        in: 'path',
                        required: true,
                        schema: {
                            type: 'string',
                        },
                    },
                },
            },
        });

        expect(result.status).toBe('PASS');
    });

});
