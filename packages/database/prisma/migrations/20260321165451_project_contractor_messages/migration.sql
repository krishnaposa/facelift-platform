-- CreateTable
CREATE TABLE "ProjectContractorMessage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contractorId" TEXT NOT NULL,
    "projectItemId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "ProjectContractorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectContractorMessage_projectId_idx" ON "ProjectContractorMessage"("projectId");

-- CreateIndex
CREATE INDEX "ProjectContractorMessage_contractorId_idx" ON "ProjectContractorMessage"("contractorId");

-- AddForeignKey
ALTER TABLE "ProjectContractorMessage" ADD CONSTRAINT "ProjectContractorMessage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContractorMessage" ADD CONSTRAINT "ProjectContractorMessage_contractorId_fkey" FOREIGN KEY ("contractorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectContractorMessage" ADD CONSTRAINT "ProjectContractorMessage_projectItemId_fkey" FOREIGN KEY ("projectItemId") REFERENCES "ProjectItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
