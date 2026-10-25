
import { describe, expect, it } from 'vitest';

import type {
  OpenApiSpecification,
} from '../interfaces/governance-rule.interface.js';

import {
  Governance001ApiOwnerRule,
} from './governance-001-api-owner.rule.js';

describe('Governance001ApiOwnerRule', () => {
  const rule = new Governance001ApiOwnerRule();

  const specification = {
    openapi: '3.0.3',
    info: {
      title: 'Customer API',
      version: '1.0.0',
    },
    paths: {},
  } as OpenApiSpecification;

  it('aprueba una API con equipo responsable', () => {
    const result = rule.evaluate(
      specification,
      { apiOwner: 'Equipo Integraciones' },
    );

    expect(result.status).toBe('PASS');
  });

  it('aprueba una API con responsable individual', () => {
    const result = rule.evaluate(
      specification,
      { apiOwner: 'API Product Owner' },
    );

    expect(result.status).toBe('PASS');
  });

  it('rechaza el valor Unassigned', () => {
    const result = rule.evaluate(
      specification,
      { apiOwner: 'Unassigned' },
    );

    expect(result.status).toBe('FAIL');
  });

  it('rechaza Unassigned ignorando mayúsculas', () => {
    const result = rule.evaluate(
      specification,
      { apiOwner: '  UNASSIGNED  ' },
    );

    expect(result.status).toBe('FAIL');
  });

  it('rechaza un responsable vacío', () => {
    const result = rule.evaluate(
      specification,
      { apiOwner: '' },
    );

    expect(result.status).toBe('FAIL');
  });

  it('rechaza un responsable con espacios', () => {
    const result = rule.evaluate(
      specification,
      { apiOwner: '   ' },
    );

    expect(result.status).toBe('FAIL');
  });

  it('advierte cuando falta el contexto', () => {
    const result = rule.evaluate(specification);

    expect(result.status).toBe('WARNING');
  });

  it('advierte cuando no se proporciona apiOwner', () => {
    const result = rule.evaluate(
      specification,
      { registeredApiVersion: '1.0.0' },
    );

    expect(result.status).toBe('WARNING');
  });

  it('incluye evidencia del responsable aprobado', () => {
    const result = rule.evaluate(
      specification,
      { apiOwner: 'Arquitectura' },
    );

    expect(result.evidence).toContain('Arquitectura');
  });
});
