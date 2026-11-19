-- Auditoría de acciones técnicas y administrativas del MVP.
CREATE TABLE "audit_events" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "apiId" TEXT,
  "detail" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_events_createdAt_idx" ON "audit_events"("createdAt");
CREATE INDEX "audit_events_actorId_createdAt_idx" ON "audit_events"("actorId", "createdAt");
CREATE INDEX "audit_events_entityType_entityId_idx" ON "audit_events"("entityType", "entityId");
CREATE INDEX "audit_events_apiId_createdAt_idx" ON "audit_events"("apiId", "createdAt");

ALTER TABLE "audit_events"
  ADD CONSTRAINT "audit_events_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
