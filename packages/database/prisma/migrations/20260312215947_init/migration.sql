/*
  Warnings:

  - You are about to alter the column `amount` on the `Bid` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(12,2)`.
  - You are about to drop the column `selections` on the `Project` table. All the data in the column will be lost.
  - The `status` column on the `Project` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[projectId,contractorId]` on the table `Bid` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Bid` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `role` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('HOMEOWNER', 'CONTRACTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'OPEN', 'IN_REVIEW', 'AWARDED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'WITHDRAWN', 'SHORTLISTED', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ContractorApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- DropForeignKey
ALTER TABLE "Bid" DROP CONSTRAINT "Bid_projectId_fkey";

-- AlterTable
ALTER TABLE "Bid" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "BidStatus" NOT NULL DEFAULT 'SUBMITTED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "selections",
ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ProjectStatus" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL;

-- CreateTable
CREATE TABLE "HomeownerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeownerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "phone" TEXT,
    "licenseNumber" TEXT,
    "insuranceDocUrl" TEXT,
    "serviceZipCodes" TEXT[],
    "approvalStatus" "ContractorApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "unitLabel" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "optionsSchema" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "selectedOptions" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidLineItem" (
    "id" TEXT NOT NULL,
    "bidId" TEXT NOT NULL,
    "projectItemId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,

    CONSTRAINT "BidLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectPhoto" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryImage" (
    "id" TEXT NOT NULL,
    "catalogItemId" TEXT,
    "imageUrl" TEXT NOT NULL,
    "title" TEXT,
    "caption" TEXT,
    "styleTag" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HomeownerProfile_userId_key" ON "HomeownerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ContractorProfile_userId_key" ON "ContractorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogCategory_name_key" ON "CatalogCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogCategory_slug_key" ON "CatalogCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogItem_slug_key" ON "CatalogItem"("slug");

-- CreateIndex
CREATE INDEX "ProjectItem_projectId_idx" ON "ProjectItem"("projectId");

-- CreateIndex
CREATE INDEX "ProjectItem_catalogItemId_idx" ON "ProjectItem"("catalogItemId");

-- CreateIndex
CREATE UNIQUE INDEX "BidLineItem_bidId_projectItemId_key" ON "BidLineItem"("bidId", "projectItemId");

-- CreateIndex
CREATE INDEX "ProjectPhoto_projectId_idx" ON "ProjectPhoto"("projectId");

-- CreateIndex
CREATE INDEX "GalleryImage_catalogItemId_idx" ON "GalleryImage"("catalogItemId");

-- CreateIndex
CREATE INDEX "GalleryImage_isPublic_idx" ON "GalleryImage"("isPublic");

-- CreateIndex
CREATE INDEX "Bid_projectId_idx" ON "Bid"("projectId");

-- CreateIndex
CREATE INDEX "Bid_contractorId_idx" ON "Bid"("contractorId");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_projectId_contractorId_key" ON "Bid"("projectId", "contractorId");

-- CreateIndex
CREATE INDEX "Project_homeownerId_idx" ON "Project"("homeownerId");

-- CreateIndex
CREATE INDEX "Project_zipCode_idx" ON "Project"("zipCode");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- AddForeignKey
ALTER TABLE "HomeownerProfile" ADD CONSTRAINT "HomeownerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractorProfile" ADD CONSTRAINT "ContractorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogItem" ADD CONSTRAINT "CatalogItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CatalogCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectItem" ADD CONSTRAINT "ProjectItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectItem" ADD CONSTRAINT "ProjectItem_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidLineItem" ADD CONSTRAINT "BidLineItem_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "Bid"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidLineItem" ADD CONSTRAINT "BidLineItem_projectItemId_fkey" FOREIGN KEY ("projectItemId") REFERENCES "ProjectItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectPhoto" ADD CONSTRAINT "ProjectPhoto_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryImage" ADD CONSTRAINT "GalleryImage_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
