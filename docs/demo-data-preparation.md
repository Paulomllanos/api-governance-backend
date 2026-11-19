# Preparación de datos para una demostración pública del MVP

## Decisión

**Crear una base de datos PostgreSQL independiente en el hosting de demostración. No vaciar la base de desarrollo.**

Las pruebas de aceptación, la comparación manual vs. automatizada y el historial auditado son evidencia académica. Su eliminación puede impedir reproducir resultados.

## Qué incluir en la nueva base

| Entidad | Estado inicial propuesto |
|---|---|
| `Role` | Tres roles: ADMIN, REVIEWER, DEVELOPER |
| `User` | Tres cuentas controladas; mismo nombre/correo/rol únicamente si son apropiados para una demostración pública |
| `UserRole` | Asignaciones mínimas necesarias |
| `AuthSession` | Sin sesiones migradas; iniciar sesión de nuevo |
| `Api`, `ApiVersion` | Sin registros |
| `OpenApiDocument` | Sin registros |
| `GovernanceExecution`, `RuleResult` | Sin registros |
| `WorkflowTransition`, `NotificationRead` | Sin registros |
| `AuditEvent` | Sin eventos de desarrollo; crear nuevos eventos durante la demo |

## Procedimiento controlado

1. Verificar que el `DATABASE_URL` de despliegue apunte a la **base nueva**, no a desarrollo o pruebas.
2. Ejecutar `npx prisma generate` y `npx prisma migrate deploy` contra la nueva base.
3. Ejecutar `npx tsx scripts/seed-roles.ts` para crear los tres roles.
4. Configurar `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME` y `BOOTSTRAP_ADMIN_PASSWORD` en un entorno seguro y ejecutar una única vez `npx tsx scripts/bootstrap-admin.ts`.
5. Entrar con ADMIN, crear los otros dos usuarios de demostración y asignar los roles requeridos. Crear **contraseñas nuevas** y no copiar sesiones ni hashes de otro ambiente.
6. Confirmar en la base nueva que no existan APIs, versiones, documentos, evaluaciones, hallazgos ni transiciones.
7. Completar una prueba integral de la demo y conservar registros de auditoría generados en el nuevo entorno.

## Si se decide limpiar una base existente

**No ejecutar `TRUNCATE ... CASCADE` ni `prisma migrate reset` sobre una base con información académica.** Antes de cualquier eliminación: respaldo verificable, conexión confirmada, aprobación explícita sobre la instancia seleccionada, identificación de dependencias, plan de reversión y ejecución controlada.

La política actual es **no eliminar datos**: una nueva base aislada satisface el objetivo sin riesgo de borrar evidencias.

## Privacidad y seguridad

Usar cuentas dedicadas y correos de prueba apropiados para exposición; no publicar contraseñas o información personal en documentación, capturas o logs. Evitar nombres y contratos de clientes reales. Revisar límites y política de suspensión del hosting gratuito antes de la defensa.
