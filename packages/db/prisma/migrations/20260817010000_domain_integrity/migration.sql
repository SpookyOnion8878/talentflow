-- DropForeignKey
ALTER TABLE "project_assignments" DROP CONSTRAINT "project_assignments_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_assignments" DROP CONSTRAINT "project_assignments_freelancerId_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_freelancerId_fkey";

-- DropForeignKey
ALTER TABLE "contracts" DROP CONSTRAINT "contracts_projectId_fkey";

-- DropForeignKey
ALTER TABLE "timesheets" DROP CONSTRAINT "timesheets_freelancerId_fkey";

-- DropForeignKey
ALTER TABLE "timesheets" DROP CONSTRAINT "timesheets_contractId_fkey";

-- DropForeignKey
ALTER TABLE "timesheets" DROP CONSTRAINT "timesheets_projectId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_freelancerId_fkey";

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_contractId_fkey";

-- DropIndex
DROP INDEX "payments_invoiceId_key";

-- AlterTable
ALTER TABLE "projects" ALTER COLUMN "budget" SET DATA TYPE DECIMAL(19,4);

-- Add tenant columns as nullable so existing rows can be backfilled safely.
ALTER TABLE "project_assignments" ADD COLUMN "companyId" TEXT;

-- AlterTable
ALTER TABLE "contracts" ALTER COLUMN "ratePerHour" SET DATA TYPE DECIMAL(19,4);

ALTER TABLE "timesheets" ADD COLUMN "companyId" TEXT;

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "calculationVersion" TEXT NOT NULL DEFAULT 'invoice-v1',
ADD COLUMN     "taxRate" DECIMAL(7,6) NOT NULL DEFAULT 0.11,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "taxAmount" SET DATA TYPE DECIMAL(19,4),
ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(19,4);

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(19,4);

-- Backfill tenant ownership from mandatory parent records.
UPDATE "project_assignments" AS assignment
SET "companyId" = project."companyId"
FROM "projects" AS project
WHERE assignment."projectId" = project."id";

UPDATE "timesheets" AS timesheet
SET "companyId" = freelancer."companyId"
FROM "freelancers" AS freelancer
WHERE timesheet."freelancerId" = freelancer."id";

-- Abort before constraints are changed if legacy data crosses tenant boundaries.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "project_assignments" AS assignment
    JOIN "freelancers" AS freelancer ON freelancer."id" = assignment."freelancerId"
    WHERE assignment."companyId" IS NULL
       OR freelancer."companyId" <> assignment."companyId"
  ) THEN
    RAISE EXCEPTION 'Cannot migrate project assignments with missing or cross-tenant relations';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "contracts" AS contract
    LEFT JOIN "freelancers" AS freelancer ON freelancer."id" = contract."freelancerId"
    LEFT JOIN "projects" AS project ON project."id" = contract."projectId"
    WHERE freelancer."companyId" IS DISTINCT FROM contract."companyId"
       OR (contract."projectId" IS NOT NULL AND project."companyId" IS DISTINCT FROM contract."companyId")
  ) THEN
    RAISE EXCEPTION 'Cannot migrate contracts with missing or cross-tenant relations';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "timesheets" AS timesheet
    LEFT JOIN "contracts" AS contract ON contract."id" = timesheet."contractId"
    LEFT JOIN "projects" AS project ON project."id" = timesheet."projectId"
    WHERE timesheet."companyId" IS NULL
       OR (timesheet."contractId" IS NOT NULL AND contract."companyId" IS DISTINCT FROM timesheet."companyId")
       OR (timesheet."projectId" IS NOT NULL AND project."companyId" IS DISTINCT FROM timesheet."companyId")
  ) THEN
    RAISE EXCEPTION 'Cannot migrate timesheets with missing or cross-tenant relations';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "invoices" AS invoice
    LEFT JOIN "freelancers" AS freelancer ON freelancer."id" = invoice."freelancerId"
    LEFT JOIN "contracts" AS contract ON contract."id" = invoice."contractId"
    WHERE freelancer."companyId" IS DISTINCT FROM invoice."companyId"
       OR (invoice."contractId" IS NOT NULL AND contract."companyId" IS DISTINCT FROM invoice."companyId")
  ) THEN
    RAISE EXCEPTION 'Cannot migrate invoices with missing or cross-tenant relations';
  END IF;
END $$;

ALTER TABLE "project_assignments" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "timesheets" ALTER COLUMN "companyId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "freelancers_id_companyId_key" ON "freelancers"("id", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_id_companyId_key" ON "projects"("id", "companyId");

-- CreateIndex
CREATE INDEX "project_assignments_companyId_idx" ON "project_assignments"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_id_companyId_key" ON "contracts"("id", "companyId");

-- CreateIndex
CREATE INDEX "timesheets_companyId_idx" ON "timesheets"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_id_companyId_key" ON "invoices"("id", "companyId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_status_idx" ON "payments"("invoiceId", "status");

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_assignments" ADD CONSTRAINT "project_assignments_freelancerId_companyId_fkey" FOREIGN KEY ("freelancerId", "companyId") REFERENCES "freelancers"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_freelancerId_companyId_fkey" FOREIGN KEY ("freelancerId", "companyId") REFERENCES "freelancers"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_freelancerId_companyId_fkey" FOREIGN KEY ("freelancerId", "companyId") REFERENCES "freelancers"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_contractId_companyId_fkey" FOREIGN KEY ("contractId", "companyId") REFERENCES "contracts"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_projectId_companyId_fkey" FOREIGN KEY ("projectId", "companyId") REFERENCES "projects"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_freelancerId_companyId_fkey" FOREIGN KEY ("freelancerId", "companyId") REFERENCES "freelancers"("id", "companyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_contractId_companyId_fkey" FOREIGN KEY ("contractId", "companyId") REFERENCES "contracts"("id", "companyId") ON DELETE RESTRICT ON UPDATE CASCADE;
