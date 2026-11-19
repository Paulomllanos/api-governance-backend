-- CreateTable
CREATE TABLE "notification_reads" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transitionId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_reads_transitionId_idx" ON "notification_reads"("transitionId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_reads_userId_transitionId_key" ON "notification_reads"("userId", "transitionId");

-- AddForeignKey
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_transitionId_fkey" FOREIGN KEY ("transitionId") REFERENCES "workflow_transitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
