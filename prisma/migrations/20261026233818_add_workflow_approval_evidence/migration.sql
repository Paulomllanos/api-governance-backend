-- AlterTable
ALTER TABLE "workflow_transitions" ADD COLUMN     "evaluatedDocumentId" TEXT,
ADD COLUMN     "evaluatedRules" INTEGER,
ADD COLUMN     "evaluationHasBlockingIssues" BOOLEAN,
ADD COLUMN     "evaluationId" TEXT,
ADD COLUMN     "evaluationScore" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "workflow_transitions_evaluationId_idx" ON "workflow_transitions"("evaluationId");

-- AddForeignKey
ALTER TABLE "workflow_transitions" ADD CONSTRAINT "workflow_transitions_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "governance_executions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
