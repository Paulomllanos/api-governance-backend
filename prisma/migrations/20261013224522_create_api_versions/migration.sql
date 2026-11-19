-- CreateTable
CREATE TABLE "api_versions" (
    "id" TEXT NOT NULL,
    "apiId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_versions_apiId_idx" ON "api_versions"("apiId");

-- CreateIndex
CREATE UNIQUE INDEX "api_versions_apiId_version_key" ON "api_versions"("apiId", "version");

-- AddForeignKey
ALTER TABLE "api_versions" ADD CONSTRAINT "api_versions_apiId_fkey" FOREIGN KEY ("apiId") REFERENCES "apis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
