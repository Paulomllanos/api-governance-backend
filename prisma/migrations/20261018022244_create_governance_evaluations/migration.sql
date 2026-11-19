-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "RuleResultStatus" AS ENUM ('PASS', 'FAIL', 'WARNING', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "governance_executions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "executedBy" TEXT NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "qualityScore" DOUBLE PRECISION,
    "hasBlockingIssues" BOOLEAN,
    "totalRules" INTEGER NOT NULL DEFAULT 0,
    "passedRules" INTEGER NOT NULL DEFAULT 0,
    "failedRules" INTEGER NOT NULL DEFAULT 0,
    "warningRules" INTEGER NOT NULL DEFAULT 0,
    "notApplicableRules" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "governance_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_results" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "status" "RuleResultStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "evidence" TEXT,
    "recommendation" TEXT,

    CONSTRAINT "rule_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "governance_executions_documentId_requestedAt_idx" ON "governance_executions"("documentId", "requestedAt");

-- CreateIndex
CREATE INDEX "governance_executions_status_idx" ON "governance_executions"("status");

-- CreateIndex
CREATE INDEX "rule_results_ruleId_idx" ON "rule_results"("ruleId");

-- CreateIndex
CREATE UNIQUE INDEX "rule_results_executionId_ruleId_key" ON "rule_results"("executionId", "ruleId");

-- AddForeignKey
ALTER TABLE "governance_executions" ADD CONSTRAINT "governance_executions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "openapi_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_results" ADD CONSTRAINT "rule_results_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "governance_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
