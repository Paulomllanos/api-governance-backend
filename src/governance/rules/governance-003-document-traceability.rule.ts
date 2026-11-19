
import type {
  GovernanceRule,
  GovernanceRuleEvaluation,
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import type {
  GovernanceEvaluationContext,
} from '../interfaces/governance-evaluation-context.interface.js';

export class Governance003DocumentTraceabilityRule
  implements GovernanceRule
{
  readonly id = 'GOVERNANCE-003';

  readonly name = 'Trazabilidad del documento OpenAPI';

  readonly description =
    'El documento evaluado debe conservar metadatos ' +
    'de origen y validación de ingesta.';

  readonly category = 'GOVERNANCE' as const;

  readonly severity = 'MEDIUM' as const;

  readonly weight = 1;

  evaluate(
    _specification: OpenApiSpecification,
    context?: GovernanceEvaluationContext,
  ): GovernanceRuleEvaluation {
    if (
      context?.documentFileName === undefined ||
      context.documentUploadedBy === undefined ||
      context.documentIsValid === undefined
    ) {
      return {
        status: 'WARNING',
        message:
          'No se recibieron todos los metadatos del documento.',
        recommendation:
          'Incluye fileName, uploadedBy e isValid ' +
          'en el contexto de evaluación.',
      };
    }

    const findings: string[] = [];

    if (
      typeof context.documentFileName !== 'string' ||
      !context.documentFileName.trim()
    ) {
      findings.push(
        'OpenApiDocument.fileName está vacío o es inválido.',
      );
    }

    if (
      typeof context.documentUploadedBy !== 'string' ||
      !context.documentUploadedBy.trim()
    ) {
      findings.push(
        'OpenApiDocument.uploadedBy está vacío o es inválido.',
      );
    }

    if (context.documentIsValid !== true) {
      findings.push(
        'OpenApiDocument.isValid no confirma ' +
        'una ingesta válida.',
      );
    }

    if (findings.length > 0) {
      return {
        status: 'FAIL',
        message:
          `Se detectaron ${findings.length} incumplimientos ` +
          'de trazabilidad documental.',
        evidence: JSON.stringify(findings),
        recommendation:
          'Corrige los metadatos del documento ' +
          'y valida su ingesta antes de evaluarlo.',
      };
    }

    return {
      status: 'PASS',
      message:
        'El documento cuenta con metadatos ' +
        'de origen y validación de ingesta.',
      evidence: JSON.stringify({
        fileName: context.documentFileName,
        uploadedBy: context.documentUploadedBy,
        isValid: context.documentIsValid,
      }),
    };
  }
}
