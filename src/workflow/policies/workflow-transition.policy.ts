
import {
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';

import type {
  WorkflowStatus,
} from '@prisma/client';

import {
  hasAnyRolePermission,
  type AppPermission,
} from '../../authorization/policies/rbac.policy.js';

export interface WorkflowTransitionRule {
  from: WorkflowStatus;
  to: WorkflowStatus;
  permission: AppPermission;
  requiresComment: boolean;
  requiresApprovedEvaluation: boolean;
}

export const WORKFLOW_TRANSITIONS: readonly WorkflowTransitionRule[] = [
  {
    from: 'DRAFT',
    to: 'IN_REVIEW',
    permission: 'reviews:request',
    requiresComment: false,
    requiresApprovedEvaluation: false,
  },
  {
    from: 'IN_REVIEW',
    to: 'OBSERVED',
    permission: 'reviews:reject',
    requiresComment: true,
    requiresApprovedEvaluation: false,
  },
  {
    from: 'OBSERVED',
    to: 'CORRECTED',
    permission: 'reviews:request',
    requiresComment: true,
    requiresApprovedEvaluation: false,
  },
  {
    from: 'CORRECTED',
    to: 'IN_REVIEW',
    permission: 'reviews:request',
    requiresComment: false,
    requiresApprovedEvaluation: false,
  },
  {
    from: 'IN_REVIEW',
    to: 'APPROVED',
    permission: 'reviews:approve',
    requiresComment: false,
    requiresApprovedEvaluation: true,
  },
  {
    from: 'APPROVED',
    to: 'PUBLISHED',
    permission: 'versions:publish',
    requiresComment: false,
    requiresApprovedEvaluation: false,
  },
];

export function validateWorkflowTransition(input: {
  from: WorkflowStatus;
  to: WorkflowStatus;
  roles: readonly string[];
  comment?: string | null;
}): WorkflowTransitionRule {
  const transition = WORKFLOW_TRANSITIONS.find(
    (item) =>
      item.from === input.from &&
      item.to === input.to,
  );

  if (!transition) {
    throw new ConflictException(
      `No se permite cambiar de ${input.from} a ${input.to}.`,
    );
  }

  if (
    !hasAnyRolePermission(
      input.roles,
      transition.permission,
    )
  ) {
    throw new ForbiddenException(
      'No tienes permisos para realizar esta transición.',
    );
  }

  if (
    transition.requiresComment &&
    !input.comment?.trim()
  ) {
    throw new ConflictException(
      'Esta transición requiere un comentario.',
    );
  }

  return transition;
}
