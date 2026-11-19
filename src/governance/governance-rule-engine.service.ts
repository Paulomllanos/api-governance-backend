
import {
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';

import type {
    GovernanceRule,
    OpenApiSpecification,
} from './interfaces/governance-rule.interface.js';

import type {
    GovernanceEngineResult,
    GovernanceRuleResult,
} from './interfaces/governance-result.interface.js';

// Reglas importadas

import {
    getGovernanceRules,
} from './catalog/governance-rules.catalog.js';

import type {
  GovernanceEvaluationContext,
} from './interfaces/governance-evaluation-context.interface.js';

@Injectable()
export class GovernanceRuleEngineService {
    private readonly rules: GovernanceRule[] =
        getGovernanceRules();

    execute(
        specification: OpenApiSpecification,
        context: GovernanceEvaluationContext = {},
    ): GovernanceEngineResult {
        if (this.rules.length === 0) {
            throw new InternalServerErrorException(
                'No hay reglas de gobierno configuradas.',
            );
        }

        const results: GovernanceRuleResult[] =
            this.rules.map((rule) => {
                const evaluation = rule.evaluate(specification, context);

                return {
                    ruleId: rule.id,
                    ruleName: rule.name,
                    category: rule.category,
                    severity: rule.severity,
                    weight: rule.weight,
                    ...evaluation,
                };
            });

        return {
            totalRules: results.length,

            passedRules: results.filter(
                (result) => result.status === 'PASS',
            ).length,

            failedRules: results.filter(
                (result) => result.status === 'FAIL',
            ).length,

            warningRules: results.filter(
                (result) => result.status === 'WARNING',
            ).length,

            notApplicableRules: results.filter(
                (result) =>
                    result.status === 'NOT_APPLICABLE',
            ).length,

            results,
        };
    }
}
