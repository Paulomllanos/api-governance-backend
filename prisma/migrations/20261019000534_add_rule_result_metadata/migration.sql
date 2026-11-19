-- CreateEnum
CREATE TYPE "GovernanceRuleCategory" AS ENUM ('DESIGN', 'DOCUMENTATION', 'SECURITY', 'VERSIONING', 'OBSERVABILITY', 'GOVERNANCE');

-- CreateEnum
CREATE TYPE "GovernanceRuleSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "rule_results" ADD COLUMN     "category" "GovernanceRuleCategory",
ADD COLUMN     "ruleName" TEXT,
ADD COLUMN     "severity" "GovernanceRuleSeverity",
ADD COLUMN     "weight" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "rule_results_category_severity_idx" ON "rule_results"("category", "severity");
