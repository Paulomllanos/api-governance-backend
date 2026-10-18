-- CreateEnum
CREATE TYPE "OpenApiFormat" AS ENUM ('JSON', 'YAML');

-- CreateTable
CREATE TABLE "openapi_documents" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "format" "OpenApiFormat" NOT NULL,
    "openApiVersion" TEXT NOT NULL,
    "isValid" BOOLEAN NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "openapi_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "openapi_documents_versionId_idx" ON "openapi_documents"("versionId");

-- AddForeignKey
ALTER TABLE "openapi_documents" ADD CONSTRAINT "openapi_documents_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "api_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
