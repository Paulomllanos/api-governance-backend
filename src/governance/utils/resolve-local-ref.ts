
export type OpenApiObject = Record<string, unknown>;

export function isOpenApiObject(
  value: unknown,
): value is OpenApiObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

export type ReferenceResolution =
  | { status: 'RESOLVED'; value: OpenApiObject }
  | { status: 'UNRESOLVED'; reason: string };

export function resolveLocalRef(
  reference: string,
  specification: OpenApiObject,
): ReferenceResolution {
  if (!reference.startsWith('#/')) {
    return {
      status: 'UNRESOLVED',
      reason: `Referencia externa o no compatible: ${reference}`,
    };
  }

  const visited = new Set<string>();
  let currentReference = reference;

  for (let depth = 0; depth < 20; depth++) {
    if (visited.has(currentReference)) {
      return {
        status: 'UNRESOLVED',
        reason: `Referencia circular: ${currentReference}`,
      };
    }

    visited.add(currentReference);

    const segments = currentReference
      .slice(2)
      .split('/')
      .map((segment) =>
        segment.replace(/~1/g, '/').replace(/~0/g, '~'),
      );

    let value: unknown = specification;

    for (const segment of segments) {
      if (
        !isOpenApiObject(value) ||
        !Object.hasOwn(value, segment)
      ) {
        return {
          status: 'UNRESOLVED',
          reason: `Referencia no encontrada: ${currentReference}`,
        };
      }

      value = value[segment];
    }

    if (!isOpenApiObject(value)) {
      return {
        status: 'UNRESOLVED',
        reason: `La referencia no apunta a un objeto: ${currentReference}`,
      };
    }

    if (typeof value.$ref !== 'string') {
      return {
        status: 'RESOLVED',
        value,
      };
    }

    currentReference = value.$ref;
  }

  return {
    status: 'UNRESOLVED',
    reason: 'Se superó la profundidad máxima de referencias.',
  };
}
