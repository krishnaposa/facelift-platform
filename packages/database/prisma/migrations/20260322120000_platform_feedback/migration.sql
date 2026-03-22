-- CreateEnum
CREATE TYPE "PlatformFeedbackCategory" AS ENUM ('BUG', 'FEATURE_REQUEST', 'ACCOUNT', 'BILLING', 'PROJECT_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "PlatformFeedbackStatus" AS ENUM ('OPEN', 'REVIEWED');

-- CreateTable
CREATE TABLE "PlatformFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "PlatformFeedbackCategory" NOT NULL DEFAULT 'OTHER',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "projectId" TEXT,
    "status" "PlatformFeedbackStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "PlatformFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlatformFeedback_userId_idx" ON "PlatformFeedback"("userId");

-- CreateIndex
CREATE INDEX "PlatformFeedback_status_idx" ON "PlatformFeedback"("status");

-- CreateIndex
CREATE INDEX "PlatformFeedback_createdAt_idx" ON "PlatformFeedback"("createdAt");

-- AddForeignKey
ALTER TABLE "PlatformFeedback" ADD CONSTRAINT "PlatformFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformFeedback" ADD CONSTRAINT "PlatformFeedback_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
