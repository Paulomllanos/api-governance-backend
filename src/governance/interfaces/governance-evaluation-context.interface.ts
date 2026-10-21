
export interface GovernanceEvaluationContext {
  /**
   * Versión registrada en API Governance Platform.
   *
   * Ejemplo: "1.2.0"
   *
   * Es opcional para conservar compatibilidad
   * con evaluaciones que solo reciben OpenAPI.
   */
  registeredApiVersion?: string;
}
