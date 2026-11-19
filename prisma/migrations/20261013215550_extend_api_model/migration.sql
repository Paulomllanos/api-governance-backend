-- CreateEnum
CREATE TYPE "ApiLifecycleStatus" AS ENUM ('ACTIVE', 'DRAFT', 'DEPRECATED');

-- AlterTable
ALTER TABLE "apis" ADD COLUMN     "owner" TEXT NOT NULL DEFAULT 'Unassigned',
ADD COLUMN     "status" "ApiLifecycleStatus" NOT NULL DEFAULT 'DRAFT';
