
import type {
  GovernanceRule,
  GovernanceRuleEvaluation,
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

export class Design001PathNamingRule
  implements GovernanceRule
{
  readonly id = 'DESIGN-001';

  readonly name = 'Nomenclatura de rutas REST';

  readonly description =
    'Las rutas deben utilizar segmentos estáticos en minúsculas y kebab-case.';

  readonly category = 'DESIGN' as const;

  readonly severity = 'MEDIUM' as const;

  readonly weight = 1;

  evaluate(
    specification: OpenApiSpecification,
  ): GovernanceRuleEvaluation {
    const paths = specification.paths;

    if (
      typeof paths !== 'object' ||
      paths === null ||
      Array.isArray(paths)
    ) {
      return {
        status: 'FAIL',
        message: 'La especificación no contiene un objeto paths válido.',
        evidence: 'paths',
        recommendation:
          'Define correctamente las rutas de la API en la propiedad paths.',
      };
    }

    const pathNames = Object.keys(paths);

    if (pathNames.length === 0) {
      return {
        status: 'NOT_APPLICABLE',
        message:
          'No existen rutas declaradas para evaluar su nomenclatura.',
      };
    }

    const invalidPaths: string[] = [];

    for (const path of pathNames) {
      const segments = path.split('/').filter(Boolean);

      const isValid = path.startsWith('/') &&
        segments.every((segment) => {
          // No validamos la nomenclatura de parámetros.
          if (/^\{[^{}]+\}$/.test(segment)) {
            return true;
          }

          // Segmentos estáticos en kebab-case.
          return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
            segment,
          );
        });

      if (!isValid) {
        invalidPaths.push(path);
      }
    }

    if (invalidPaths.length > 0) {
      return {
        status: 'FAIL',
        message:
          `Se detectaron ${invalidPaths.length} rutas con nomenclatura incorrecta.`,
        evidence: JSON.stringify(invalidPaths),
        recommendation:
          'Utiliza minúsculas y kebab-case en los segmentos estáticos de las rutas.',
      };
    }

    return {
      status: 'PASS',
      message:
        `Las ${pathNames.length} rutas cumplen la nomenclatura establecida.`,
      evidence: JSON.stringify(pathNames),
    };
  }
}
