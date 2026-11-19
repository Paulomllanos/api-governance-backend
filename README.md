# Plataforma de Gobierno de APIs — Backend

Backend REST del **MVP de Gobierno de APIs**, desarrollado como Proyecto de Título de Ingeniería en Computación e Informática (UNAB). Implementa registro y versionado de APIs, ingestión de contratos OpenAPI, evaluación mediante reglas de gobierno, Quality Score, revisión y aprobación, auditoría, sesiones y control de acceso.

> **Alcance:** software académico para demostración y evaluación controlada. No equivale a un API Gateway, a un APIM comercial ni a una auditoría de seguridad productiva.

## Arquitectura

```text
React + Vite (frontend)
       │ HTTPS /api/v1
       ▼
NestJS REST API (JWT + RBAC)
       ├── API / Versiones / OpenAPI
       ├── Motor de 18 reglas / Quality Score / Hallazgos
       ├── Workflow de revisión / Aprobaciones
       ├── Auditoría / Notificaciones / Dashboard
       └── Usuarios / Roles / Sesiones
                      │
                     Prisma
                      │
                  PostgreSQL
```

[Repositorio frontend](https://github.com/Paulomllanos/API-Governance-Platform).

## Tecnologías

- Node.js 22, TypeScript, NestJS 12.
- Prisma 6.19 y PostgreSQL.
- JWT firmado, Argon2id para contraseñas y refresh tokens rotativos en cookies HttpOnly.
- Validación de DTO con `class-validator` y `ValidationPipe`.
- Vitest para pruebas unitarias, de integración y E2E; Oxlint para análisis estático.

## Módulos implementados

| Módulo | Responsabilidad |
|---|---|
| Auth / Users / Admin Users | Autenticación, cuentas, roles y sesiones |
| Authorization | RBAC y permisos por endpoint |
| APIs / Versions | Catálogo y ciclo de vida de versiones |
| Documents | Carga y validación inicial de documentos OpenAPI |
| Governance | Motor de reglas y catálogo de políticas |
| Evaluations / Findings | Ejecuciones, resultados, recomendaciones y Quality Score |
| Workflow | Revisión, observaciones, correcciones y aprobación |
| Audit | Historial de transiciones y actividad operacional |
| Notifications / Search / Dashboard | Consultas operativas y navegación |

**Límites conocidos:** el parser realiza comprobaciones sintácticas y estructurales esenciales y no certifica cumplimiento integral de todas las especificaciones OpenAPI 3.0/3.1. Las 18 reglas son políticas del MVP, no pruebas dinámicas de seguridad.

## Instalación local

Requisitos: Node.js 22, npm y PostgreSQL accesible.

```bash
git clone https://github.com/Paulomllanos/api-governance-backend.git
cd api-governance-backend
npm ci
```

Crear un archivo `.env` **local y excluido de Git**, con valores privados:

```dotenv
DATABASE_URL=postgresql://postgres:CAMBIAR_PASSWORD@localhost:5432/api_governance?schema=public
AUTH_JWT_SECRET=REEMPLAZAR_POR_SECRETO_ALEATORIO_DE_32_CARACTERES_O_MAS
FRONTEND_URL=http://localhost:5173
PORT=3000
NODE_ENV=development
```

Los valores indicados son **placeholders**, no credenciales utilizables. Nunca compartir `.env`, contraseñas ni URLs de conexión reales en Issues, README o logs públicos.

Preparar base de datos:

```bash
npx prisma generate
npx prisma migrate deploy
npx tsx scripts/seed-roles.ts
```

Si la base está vacía, crear el administrador inicial **una sola vez** mediante variables de entorno `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME`, `BOOTSTRAP_ADMIN_PASSWORD` y:

```bash
npx tsx scripts/bootstrap-admin.ts
```

La contraseña de bootstrap requiere entre 12 y 128 caracteres. El script se niega a crear un segundo administrador si ya existe alguna asignación ADMIN. No conservar credenciales de bootstrap innecesariamente después de ejecutar el script.

Iniciar el servidor:

```bash
npm run start:dev
```

API base: `http://localhost:3000/api/v1`. Verificar conectividad con `GET /api/v1/health` (incluye consulta a PostgreSQL).

## Scripts

| Comando | Objetivo |
|---|---|
| `npm run start:dev` | Desarrollo con recarga |
| `npm run build` | Compilar NestJS |
| `npm run start:prod` | Ejecutar `dist/main` |
| `npm test` | Pruebas unitarias Vitest |
| `npm run test:integration` | Pruebas con `.env.test` y PostgreSQL aislado |
| `npm run test:e2e` | Pruebas E2E |
| `npm run lint` | Oxlint |
| `node scripts/compare-manual.mjs mediciones.json` | Calcular indicadores experimentales reales |

Para datos y alcance de la aceptación consultar [Plan de aceptación y evidencias](docs/mvp-acceptance-and-evidence.md).

## Seguridad

- Roles `ADMIN`, `REVIEWER` y `DEVELOPER`; autorización efectiva aplicada en backend.
- Access tokens JWT con vigencia de 15 minutos; refresh token rotado y almacenado como hash SHA-256 en PostgreSQL.
- Cookie de refresh `HttpOnly`, `Secure` cuando `NODE_ENV=production`, y actualmente `SameSite=Lax`.
- El controlador valida `Origin` contra `FRONTEND_URL` en operaciones con cookies; CORS habilita ese mismo origen y credenciales.
- **Despliegue entre dominios:** para evitar fallos de login/refresh, diseñar y validar un proxy de mismo origen o implementar cambios deliberados en política de cookies/CORS antes de exponer el servicio.
- La base de datos de demostración debe contener solo cuentas y contratos de prueba; no compartir datos personales o secretos reales.

## Preparación para despliegue gratuito

Arquitectura propuesta (sujeta a límites actuales): frontend en Vercel, backend en Render y PostgreSQL en Neon.

1. Crear **una base PostgreSQL nueva y vacía** para demostración: no conectar el servicio a la base local o de pruebas que contiene evidencias.
2. Configurar en el servicio backend `DATABASE_URL`, `AUTH_JWT_SECRET`, `FRONTEND_URL`, `NODE_ENV=production` y `PORT` según el proveedor. En plataformas que inyecten `PORT`, usar su valor.
3. Instalar dependencias y generar Prisma; compilar y ejecutar el servicio de NestJS. Para la base nueva, ejecutar `npx prisma migrate deploy` y `npx tsx scripts/seed-roles.ts` como tareas de inicialización controladas.
4. Crear cuentas de demostración con el bootstrap administrador y, posteriormente, usuarios controlados desde el módulo de administración. **No copiar hashes de contraseñas ni sesiones de desarrollo.**
5. Confirmar la configuración real del proxy de frontend, `FRONTEND_URL` y cookies antes de dar por válida la autenticación desde internet.
6. Verificar `/api/v1/health`, login, renovación/logout, CRUD de APIs, carga de OpenAPI, evaluación, workflow y auditoría con distintas autorizaciones.
7. Revisar logs y políticas de recursos gratuitos; no asumir disponibilidad 24/7.

**Nota:** este README es una guía de preparación. No implica que el despliegue esté realizado ni que los planes gratuitos garanticen disponibilidad.

## Política de limpieza y datos de demostración

**No borrar el ambiente de desarrollo para preparar la demo.** El esquema vincula `Api` con `ApiVersion`, `OpenApiDocument`, `GovernanceExecution`, `RuleResult`, `WorkflowTransition`, `NotificationRead` y `AuditEvent`. Eliminar sin considerar estas relaciones puede perder trazabilidad o fallar por restricciones `onDelete: Restrict`.

La estrategia segura es un PostgreSQL nuevo:
- Conservar en el desarrollo todos los registros y evidencias.
- Ejecutar migraciones y semilla de roles en la instancia nueva.
- Crear las tres cuentas de demostración, con contraseñas nuevas, y asignar permisos necesarios.
- Iniciar sin APIs, versiones, documentos, evaluaciones ni auditoría histórica.
- Generar auditoría propia de la demo al ejecutar las pruebas de extremo a extremo.

Consultar también [Preparación de datos para despliegue](docs/demo-data-preparation.md).

## CI y trazabilidad

`.github/workflows/mvp-ci.yml` se dispara en PR hacia `develope` y por `workflow_dispatch`. Configura PostgreSQL temporal, genera Prisma, aplica migraciones, compila, ejecuta tests unitarios y de integración. **Un merge a `main` no ejecuta automáticamente el workflow actual**; conservar los resultados y el SHA usado para cada evidencia.

## Limitaciones y propósito académico

La plataforma valida, en un entorno controlado, un flujo de gobierno de APIs con reglas estáticas y revisión humana. Los indicadores de eficiencia, precisión y exhaustividad deben derivarse de mediciones reales, no de pruebas unitarias aisladas. Para producción real se requieren revisión de seguridad, monitoreo, respaldo, gestión de secretos, límites de recursos y estrategias de recuperación.
