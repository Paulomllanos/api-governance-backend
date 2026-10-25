
import {
    ExecutionContext,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    PERMISSIONS_KEY,
    PermissionsGuard,
} from './permissions.guard.js';

import type {
    AppPermission,
} from '../policies/rbac.policy.js';

describe('PermissionsGuard', () => {
    function setup(
        roles: string[] | null,
        permissions?: readonly AppPermission[],
    ) {
        const reflector = {
            getAllAndOverride: vi.fn(() => permissions),
        } as unknown as Reflector;

        const guard = new PermissionsGuard(reflector);

        const request = {
            user:
                roles === null
                    ? undefined
                    : {
                        id: 'user-123',
                        email: 'user@example.com',
                        displayName: 'Usuario de prueba',
                        roles,
                    },
        };


        class TestController { }

        const handler = () => undefined;

        const context = {
            switchToHttp: () => ({
                getRequest: () => request,
            }),

            getHandler: () => handler,

            getClass: () => TestController,
        } as unknown as ExecutionContext;


        return {
            guard,
            context,
            reflector,
        };
    }

    it('permite acceso a un administrador', () => {
        const { guard, context } = setup(
            ['ADMIN'],
            ['apis:create'],
        );

        expect(
            guard.canActivate(context),
        ).toBe(true);
    });

    it('permite consultar APIs a un desarrollador', () => {
        const { guard, context } = setup(
            ['DEVELOPER'],
            ['apis:read'],
        );

        expect(
            guard.canActivate(context),
        ).toBe(true);
    });

    it('impide aprobar a un desarrollador', () => {
        const { guard, context } = setup(
            ['DEVELOPER'],
            ['reviews:approve'],
        );

        expect(() =>
            guard.canActivate(context),
        ).toThrow(ForbiddenException);
    });

    it('permite aprobar a un revisor', () => {
        const { guard, context } = setup(
            ['REVIEWER'],
            ['reviews:approve'],
        );

        expect(
            guard.canActivate(context),
        ).toBe(true);
    });

    it('rechaza solicitudes sin usuario autenticado', () => {
        const { guard, context } = setup(
            null,
            ['apis:read'],
        );

        expect(() =>
            guard.canActivate(context),
        ).toThrow(UnauthorizedException);
    });

    it('deniega endpoints sin política definida', () => {
        const { guard, context } = setup(
            ['ADMIN'],
            undefined,
        );

        expect(() =>
            guard.canActivate(context),
        ).toThrow(ForbiddenException);
    });

    it('deniega usuarios sin roles', () => {
        const { guard, context } = setup(
            [],
            ['apis:read'],
        );

        expect(() =>
            guard.canActivate(context),
        ).toThrow(ForbiddenException);
    });

    it('acepta múltiples roles asignados', () => {
        const { guard, context } = setup(
            ['DEVELOPER', 'REVIEWER'],
            ['reviews:approve'],
        );

        expect(
            guard.canActivate(context),
        ).toBe(true);
    });

    it('exige todos los permisos declarados', () => {
        const { guard, context } = setup(
            ['REVIEWER'],
            [
                'evaluations:read',
                'documents:upload',
            ],
        );

        expect(() =>
            guard.canActivate(context),
        ).toThrow(ForbiddenException);
    });

    it('consulta los metadatos de permisos', () => {
        const { guard, context, reflector } = setup(
            ['ADMIN'],
            ['users:manage'],
        );

        guard.canActivate(context);

        expect(
            reflector.getAllAndOverride,
        ).toHaveBeenCalledWith(
            PERMISSIONS_KEY,
            [
                context.getHandler(),
                context.getClass(),
            ],
        );
    });
});
