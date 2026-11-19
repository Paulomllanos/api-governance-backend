
import { describe, expect, it } from 'vitest';

import {
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

import {
  validateWorkflowTransition,
} from './workflow-transition.policy.js';

describe('Política de workflow', () => {
  it('permite solicitar revisión al desarrollador', () => {
    const result = validateWorkflowTransition({
      from: 'DRAFT',
      to: 'IN_REVIEW',
      roles: ['DEVELOPER'],
    });

    expect(result.permission).toBe('reviews:request');
  });

  it('permite aprobar a un revisor', () => {
    const result = validateWorkflowTransition({
      from: 'IN_REVIEW',
      to: 'APPROVED',
      roles: ['REVIEWER'],
    });

    expect(result.requiresApprovedEvaluation).toBe(true);
  });

  it('impide que un desarrollador apruebe', () => {
    expect(() =>
      validateWorkflowTransition({
        from: 'IN_REVIEW',
        to: 'APPROVED',
        roles: ['DEVELOPER'],
      }),
    ).toThrow(ForbiddenException);
  });

  it('exige comentario para registrar observaciones', () => {
    expect(() =>
      validateWorkflowTransition({
        from: 'IN_REVIEW',
        to: 'OBSERVED',
        roles: ['REVIEWER'],
        comment: '',
      }),
    ).toThrow(ConflictException);
  });

  it('permite registrar observaciones justificadas', () => {
    const result = validateWorkflowTransition({
      from: 'IN_REVIEW',
      to: 'OBSERVED',
      roles: ['REVIEWER'],
      comment: 'Debe corregirse la seguridad.',
    });

    expect(result.requiresComment).toBe(true);
  });

  it('impide publicar a un revisor', () => {
    expect(() =>
      validateWorkflowTransition({
        from: 'APPROVED',
        to: 'PUBLISHED',
        roles: ['REVIEWER'],
      }),
    ).toThrow(ForbiddenException);
  });

  it('permite publicar a un administrador', () => {
    const result = validateWorkflowTransition({
      from: 'APPROVED',
      to: 'PUBLISHED',
      roles: ['ADMIN'],
    });

    expect(result.permission).toBe('versions:publish');
  });

  it('impide saltarse la etapa de revisión', () => {
    expect(() =>
      validateWorkflowTransition({
        from: 'DRAFT',
        to: 'APPROVED',
        roles: ['ADMIN'],
      }),
    ).toThrow(ConflictException);
  });

  it('impide modificar una versión publicada', () => {
    expect(() =>
      validateWorkflowTransition({
        from: 'PUBLISHED',
        to: 'IN_REVIEW',
        roles: ['ADMIN'],
      }),
    ).toThrow(ConflictException);
  });
});
