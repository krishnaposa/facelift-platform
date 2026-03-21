-- CreateTable
CREATE TABLE "ProjectGalleryPick" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "galleryImageId" TEXT NOT NULL,
    "keywords" JSONB NOT NULL,
    "rank" INTEGER NOT NULL,
    "aiReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectGalleryPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGalleryPick" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "galleryImageId" TEXT NOT NULL,
    "keywords" JSONB NOT NULL,
    "rank" INTEGER NOT NULL,
    "aiReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGalleryPick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectGalleryPick_projectId_idx" ON "ProjectGalleryPick"("projectId");

-- CreateIndex
CREATE INDEX "ProjectGalleryPick_galleryImageId_idx" ON "ProjectGalleryPick"("galleryImageId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectGalleryPick_projectId_galleryImageId_key" ON "ProjectGalleryPick"("projectId", "galleryImageId");

-- CreateIndex
CREATE INDEX "UserGalleryPick_userId_idx" ON "UserGalleryPick"("userId");

-- CreateIndex
CREATE INDEX "UserGalleryPick_galleryImageId_idx" ON "UserGalleryPick"("galleryImageId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGalleryPick_userId_galleryImageId_key" ON "UserGalleryPick"("userId", "galleryImageId");

-- AddForeignKey
ALTER TABLE "ProjectGalleryPick" ADD CONSTRAINT "ProjectGalleryPick_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectGalleryPick" ADD CONSTRAINT "ProjectGalleryPick_galleryImageId_fkey" FOREIGN KEY ("galleryImageId") REFERENCES "GalleryImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGalleryPick" ADD CONSTRAINT "UserGalleryPick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGalleryPick" ADD CONSTRAINT "UserGalleryPick_galleryImageId_fkey" FOREIGN KEY ("galleryImageId") REFERENCES "GalleryImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
