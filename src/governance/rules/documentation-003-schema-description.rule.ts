
import type {
  GovernanceRule,
  GovernanceRuleEvaluation,
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import {
  isOpenApiObject,
} from '../utils/resolve-local-ref.js';

export class Documentation003SchemaDescriptionRule
  implements GovernanceRule
{
  readonly id = 'DOCUMENTATION-003';

  readonly name = 'Documentación de esquemas y propiedades';

  readonly description =
    'Los esquemas reutilizables y sus propiedades deben tener descripciones.';

  readonly category = 'DOCUMENTATION' as const;

  readonly severity = 'MEDIUM' as const;

  readonly weight = 1;

  evaluate(
    specification: OpenApiSpecification,
  ): GovernanceRuleEvaluation {
    const components = specification.components;

    if (components === undefined) {
      return {
        status: 'NOT_APPLICABLE',
        message:
          'El documento no declara componentes reutilizables.',
      };
    }

    if (!isOpenApiObject(components)) {
      return {
        status: 'FAIL',
        message: 'La propiedad components no es válida.',
        evidence: 'components',
        recommendation:
          'Corrige la estructura de components.',
      };
    }

    const schemas = components.schemas;

    if (schemas === undefined) {
      return {
        status: 'NOT_APPLICABLE',
        message:
          'No existen esquemas reutilizables para evaluar.',
      };
    }

    if (!isOpenApiObject(schemas)) {
      return {
        status: 'FAIL',
        message: 'components.schemas debe ser un objeto.',
        evidence: 'components.schemas',
        recommendation:
          'Declara los esquemas mediante un objeto válido.',
      };
    }

    const findings: string[] = [];
    const unresolved: string[] = [];

    let evaluatedSchemas = 0;
    let evaluatedProperties = 0;

    for (const [schemaName, schema] of Object.entries(schemas)) {
      const location = `components.schemas.${schemaName}`;

      // OpenAPI 3.1 permite esquemas booleanos.
      if (typeof schema === 'boolean') {
        continue;
      }

      if (!isOpenApiObject(schema)) {
        findings.push(`${location}: esquema inválido.`);
        continue;
      }

      if (typeof schema.$ref === 'string') {
        unresolved.push(
          `${location}: referencia de esquema no evaluada.`,
        );
        continue;
      }

      evaluatedSchemas++;

      if (
        typeof schema.description !== 'string' ||
        !schema.description.trim()
      ) {
        findings.push(
          `${location}: falta una descripción válida.`,
        );
      }

      const properties = schema.properties;

      if (properties === undefined) {
        continue;
      }

      if (!isOpenApiObject(properties)) {
        findings.push(
          `${location}.properties: estructura inválida.`,
        );
        continue;
      }

      for (const [propertyName, property] of Object.entries(
        properties,
      )) {
        const propertyLocation =
          `${location}.properties.${propertyName}`;

        // Los esquemas booleanos son posibles en OpenAPI 3.1.
        if (typeof property === 'boolean') {
          continue;
        }

        if (!isOpenApiObject(property)) {
          findings.push(
            `${propertyLocation}: propiedad inválida.`,
          );
          continue;
        }

        if (typeof property.$ref === 'string') {
          unresolved.push(
            `${propertyLocation}: referencia no evaluada.`,
          );
          continue;
        }

        evaluatedProperties++;

        if (
          typeof property.description !== 'string' ||
          !property.description.trim()
        ) {
          findings.push(
            `${propertyLocation}: falta description.`,
          );
        }
      }
    }

    if (findings.length > 0) {
      return {
        status: 'FAIL',
        message:
          `Se detectaron ${findings.length} problemas de documentación de esquemas.`,
        evidence: JSON.stringify(findings),
        recommendation:
          'Agrega descripciones claras a los esquemas y propiedades identificados.',
      };
    }

    if (unresolved.length > 0) {
      return {
        status: 'WARNING',
        message:
          'Existen referencias que no pudieron evaluarse completamente.',
        evidence: JSON.stringify(unresolved),
        recommendation:
          'Revisa la documentación de los esquemas referenciados.',
      };
    }

    if (evaluatedSchemas === 0) {
      return {
        status: 'NOT_APPLICABLE',
        message:
          'No existen esquemas reutilizables evaluables.',
      };
    }

    return {
      status: 'PASS',
      message:
        `Se verificaron ${evaluatedSchemas} esquemas y ${evaluatedProperties} propiedades documentadas.`,
    };
  }
}
