# Plan de aceptación del MVP — API Governance Platform

## Alcance
Validar en entorno controlado el flujo de registro, evaluación automatizada, observación, corrección, aprobación y trazabilidad. Los indicadores experimentales se reportan solo sobre casos y mediciones verificables.

## Escenarios de aceptación

| Caso | Prueba | Resultado esperado |
|---|---|---|
| UAT-01 | Registrar API como DEVELOPER | La API queda registrada y el evento identifica a quien la creó |
| UAT-02 | Registrar versión y cargar OpenAPI 3.0/3.1 | Se conserva el documento y se rechazan estructuras inválidas |
| UAT-03 | Ejecutar evaluación | Se registran 18 resultados por documento y el usuario solicitante |
| UAT-04 | Consultar regla, evidencia y recomendación | El catálogo refleja las mismas reglas ejecutadas por el backend |
| UAT-05 | Corregir especificación y reevaluar | El historial mantiene ambas evaluaciones, con Score recalculado |
| UAT-06 | Intentar aprobación con reglas bloqueantes | El workflow rechaza la transición |
| UAT-07 | Aprobar y publicar versión conforme | Se conservan actor, transición y evidencia de la evaluación vigente |
| UAT-08 | Probar autorización por roles | REVIEWER no carga OpenAPI; DEVELOPER no administra cuentas |
| UAT-09 | Consultar historial operacional como ADMIN | Los eventos registran actor, acción, recurso y fecha |
| UAT-10 | Revisar notificaciones | Cada rol recibe estados pertinentes y el desarrollador ve solo APIs relacionadas |

Documentar cada UAT con fecha, usuario/rol, caso de entrada, salida esperada, salida observada, evidencia y estado (aprobado/rechazado). Estas pruebas no sustituyen ensayos de seguridad y carga productivos.

## Comparación manual vs. automatizada

1. Preparar una muestra documentada de contratos OpenAPI que cubra las 18 reglas del MVP.
2. Definir **antes** de ejecutar el motor una pauta independiente de incumplimientos esperados por documento (identificador estable por hallazgo, por ejemplo `SECURITY-001:GET:/clientes`).
3. Registrar para cada caso el tiempo de una revisión manual completa y el tiempo automatizado bajo condiciones comparables, en milisegundos.
4. Comparar hallazgos mediante verdaderos positivos (TP), falsos positivos (FP) y falsos negativos (FN); calcular precisión, exhaustividad y concordancia.
5. Mantener datos de participantes anónimos en los registros de investigación; no incorporar nombres, secretos ni contratos reales en el repositorio.

**Formato de entrada** para `node scripts/compare-manual.mjs mediciones.json`:

```json
[
  {
    "caseId": "CASO-001",
    "manualMs": 120000,
    "automatedMs": 12000,
    "expectedFindings": ["DESIGN-001:/Clientes"],
    "actualFindings": ["DESIGN-001:/Clientes"]
  }
]
```

Los valores anteriores son **exclusivamente un ejemplo de formato**, no mediciones realizadas. La herramienta presenta la reducción porcentual del tiempo, precisión, exhaustividad y concordancia por caso.

Si se declara una muestra de 50 participantes o una reducción del 90 % en un artículo académico, se deberán conservar sus registros de ejecución, línea base manual, instrucciones de revisión, fechas, mecanismos de anonimización y resultados por participante.

## Limitaciones
La validación inicial de los documentos comprueba sintaxis y estructura esencial de OpenAPI; no reemplaza una validación integral contra todos los esquemas oficiales 3.0 y 3.1. Las 18 reglas evalúan políticas del MVP, no pruebas dinámicas de seguridad. Las notificaciones de desarrolladores se vinculan al responsable textual de la API o al historial de carga; una asignación organizacional explícita usuario–API es una evolución futura.
