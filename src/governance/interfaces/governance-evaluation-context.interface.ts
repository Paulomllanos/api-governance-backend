
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

   /**
   * Responsable de la API registrado en PostgreSQL.
   * Utilizado por GOVERNANCE-001.
   */
  apiOwner?: string

  /**
   * Estado del ciclo de vida de la API.
   * GOVERNANCE-002.
   */
  apiLifecycleStatus?: string;

  // GOVERNANCE-003
  documentFileName?: string;
  documentUploadedBy?: string;
  documentIsValid?: boolean;
}
