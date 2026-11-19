
import { describe, expect, it } from 'vitest';

import {
  getGovernanceRules,
} from './governance-rules.catalog.js';

describe('Governance Rules Catalog', () => {
  const rules = getGovernanceRules();

  it('contiene reglas distribuida por categorías', () => {
    // Total de reglas implementadas
    expect(rules).toHaveLength(18);

    // Verificar las reglas de diseño
    expect(
      rules.filter((rule) => rule.category === 'DESIGN'),
    ).toHaveLength(4);

    // Verificar las reglas de documentación
    expect(
      rules.filter((rule) => rule.category === 'DOCUMENTATION'),
    ).toHaveLength(4);

    // Verificar las reglas de seguridad
    expect(
      rules.filter((rule) => rule.category === 'SECURITY'),
    ).toHaveLength(3);

    // Verificar las reglas de versionado
    expect(
      rules.filter((rule) => rule.category === 'VERSIONING'),
    ).toHaveLength(2);

    // Verificar las reglas de observabilidad
    expect(
      rules.filter((rule) => rule.category === 'OBSERVABILITY'),
    ).toHaveLength(2);

    // Verificar las reglas de gobernanza
    expect(
      rules.filter((rule) => rule.category === 'GOVERNANCE'),
    ).toHaveLength(3);
  });

  it('no contiene identificadores duplicados', () => {
    const ids = rules.map((rule) => rule.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todas las reglas tienen identificador y nombre', () => {
    for (const rule of rules) {
      expect(rule.id.trim().length).toBeGreaterThan(0);
      expect(rule.name.trim().length).toBeGreaterThan(0);
    }
  });

  it('todas las reglas tienen pesos positivos', () => {
    for (const rule of rules) {
      expect(Number.isFinite(rule.weight)).toBe(true);
      expect(rule.weight).toBeGreaterThan(0);
    }
  });

  it('el catálogo contiene los identificadores esperados', () => {
    const ids = rules.map((rule) => rule.id);

    expect(ids).toEqual([
      'DESIGN-001',
      'DESIGN-002',
      'DESIGN-003',
      'DESIGN-004',
      'DOCUMENTATION-001',
      'DOCUMENTATION-002',
      'DOCUMENTATION-003',
      'DOCUMENTATION-004',
      'SECURITY-001',
      'SECURITY-002',
      'SECURITY-003',
      'VERSIONING-001',
      'VERSIONING-002',
      'OBSERVABILITY-001',
      'OBSERVABILITY-002',
      'GOVERNANCE-001',
      'GOVERNANCE-002',
      'GOVERNANCE-003',
    ]);
  });

  it('el catálogo puede devolverse sin alterar su arreglo original', () => {
    const first = getGovernanceRules();
    const second = getGovernanceRules();

    expect(first).not.toBe(second);
    expect(first.map((rule) => rule.id)).toEqual(
      second.map((rule) => rule.id),
    );
  });
});
