
import {
  describe,
  expect,
  it,
} from 'vitest';

import {
  validateWorkflowTransition,
} from './workflow-transition.policy.js';

describe('Workflow Transition Policy', () => {
  it('permite a DEVELOPER solicitar revisión', () => {
    const transition = validateWorkflowTransition({
      from: 'DRAFT',
      to: 'IN_REVIEW',
      roles: ['DEVELOPER'],
    });

    expect(transition.permission).toBe(
      'reviews:request',
    );
  });

  it('impide aprobar directamente desde DRAFT', () => {
    expect(() =>
      validateWorkflowTransition({
        from: 'DRAFT',
        to: 'APPROVED',
        roles: ['ADMIN'],
      }),
    ).toThrow();
  });

  it('impide a DEVELOPER aprobar una versión', () => {
    expect(() =>
      validateWorkflowTransition({
        from: 'IN_REVIEW',
        to: 'APPROVED',
        roles: ['DEVELOPER'],
      }),
    ).toThrow();
  });

  it('permite a REVIEWER aprobar una versión', () => {
    const transition = validateWorkflowTransition({
      from: 'IN_REVIEW',
      to: 'APPROVED',
      roles: ['REVIEWER'],
    });

    expect(
      transition.requiresApprovedEvaluation,
    ).toBe(true);
  });

  it('exige comentario para observar una versión', () => {
    expect(() =>
      validateWorkflowTransition({
        from: 'IN_REVIEW',
        to: 'OBSERVED',
        roles: ['REVIEWER'],
      }),
    ).toThrow();
  });

  it('permite registrar observaciones con comentario', () => {
    const transition = validateWorkflowTransition({
      from: 'IN_REVIEW',
      to: 'OBSERVED',
      roles: ['REVIEWER'],
      comment: 'Corregir el esquema de seguridad OAuth2.',
    });

    expect(transition.to).toBe('OBSERVED');
  });

  it('permite a DEVELOPER registrar correcciones', () => {
    const transition = validateWorkflowTransition({
      from: 'OBSERVED',
      to: 'CORRECTED',
      roles: ['DEVELOPER'],
      comment: 'Se corrigieron los hallazgos.',
    });

    expect(transition.to).toBe('CORRECTED');
  });

  it('permite reenviar una versión corregida', () => {
    const transition = validateWorkflowTransition({
      from: 'CORRECTED',
      to: 'IN_REVIEW',
      roles: ['DEVELOPER'],
    });

    expect(transition.to).toBe('IN_REVIEW');
  });

  it('impide a REVIEWER publicar versiones', () => {
    expect(() =>
      validateWorkflowTransition({
        from: 'APPROVED',
        to: 'PUBLISHED',
        roles: ['REVIEWER'],
      }),
    ).toThrow();
  });

  it('permite a ADMIN publicar versiones aprobadas', () => {
    const transition = validateWorkflowTransition({
      from: 'APPROVED',
      to: 'PUBLISHED',
      roles: ['ADMIN'],
    });

    expect(transition.permission).toBe(
      'versions:publish',
    );
  });
});
