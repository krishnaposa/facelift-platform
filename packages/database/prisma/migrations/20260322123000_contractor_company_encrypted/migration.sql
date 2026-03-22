-- AlterTable: store encrypted company name; legacy companyName becomes nullable
ALTER TABLE "ContractorProfile" ADD COLUMN "companyNameEncrypted" TEXT;

ALTER TABLE "ContractorProfile" ALTER COLUMN "companyName" DROP NOT NULL;
