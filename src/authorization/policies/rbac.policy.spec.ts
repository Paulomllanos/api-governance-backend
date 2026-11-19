
import { describe, expect, it } from 'vitest';

import {
  APP_PERMISSIONS,
  APP_ROLES,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyRolePermission,
  isAppRole,
} from './rbac.policy.js';

describe('RBAC Policy', () => {
  it('define los tres roles del MVP', () => {
    expect(APP_ROLES).toEqual([
      'ADMIN',
      'REVIEWER',
      'DEVELOPER',
    ]);
  });

  it('permite al administrador todas las acciones', () => {
    for (const permission of APP_PERMISSIONS) {
      expect(
        hasPermission('ADMIN', permission),
      ).toBe(true);
    }
  });

  it('permite al revisor aprobar evaluaciones', () => {
    expect(
      hasPermission('REVIEWER', 'reviews:approve'),
    ).toBe(true);
  });

  it('impide que el desarrollador apruebe', () => {
    expect(
      hasPermission('DEVELOPER', 'reviews:approve'),
    ).toBe(false);
  });

  it('permite al desarrollador cargar contratos', () => {
    expect(
      hasPermission('DEVELOPER', 'documents:upload'),
    ).toBe(true);
  });

  it('impide que el revisor administre usuarios', () => {
    expect(
      hasPermission('REVIEWER', 'users:manage'),
    ).toBe(false);
  });

  it('permite consultar evaluaciones a todos', () => {
    for (const role of APP_ROLES) {
      expect(
        hasPermission(role, 'evaluations:read'),
      ).toBe(true);
    }
  });

  it('deniega roles desconocidos', () => {
    expect(isAppRole('UNKNOWN')).toBe(false);

    expect(
      hasPermission('UNKNOWN', 'apis:read'),
    ).toBe(false);

    expect(
      hasPermission(undefined, 'apis:read'),
    ).toBe(false);
  });

  it('admite usuarios con múltiples roles', () => {
    expect(
      hasAnyRolePermission(
        ['DEVELOPER', 'REVIEWER'],
        'reviews:approve',
      ),
    ).toBe(true);
  });

  it('deniega una lista vacía de roles', () => {
    expect(
      hasAnyRolePermission([], 'apis:read'),
    ).toBe(false);
  });

  it('todas las asignaciones son permisos conocidos', () => {
    for (const role of APP_ROLES) {
      for (const permission of ROLE_PERMISSIONS[role]) {
        expect(APP_PERMISSIONS).toContain(permission);
      }
    }
  });


  it('permite consultar documentos a los tres roles', () => {
    for (const role of APP_ROLES) {
      expect(
        hasPermission(role, 'documents:read'),
      ).toBe(true);
    }
  });

  it('permite cargar documentos a ADMIN y DEVELOPER', () => {
    expect(
      hasPermission('ADMIN', 'documents:upload'),
    ).toBe(true);

    expect(
      hasPermission('DEVELOPER', 'documents:upload'),
    ).toBe(true);
  });

  it('impide al REVIEWER crear versiones o cargar documentos', () => {
    expect(
      hasPermission('REVIEWER', 'versions:create'),
    ).toBe(false);

    expect(
      hasPermission('REVIEWER', 'documents:upload'),
    ).toBe(false);
  });

});
