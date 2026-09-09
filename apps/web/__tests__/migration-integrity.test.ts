import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

function readWorkspaceFile(relativePath: string): string {
  return readFileSync(
    fileURLToPath(new URL(`../../../${relativePath}`, import.meta.url)),
    "utf8",
  );
}

const baseline = readWorkspaceFile(
  "packages/db/prisma/migrations/20260817000000_baseline/migration.sql",
);
const domainIntegrity = readWorkspaceFile(
  "packages/db/prisma/migrations/20260817010000_domain_integrity/migration.sql",
);
const schema = readWorkspaceFile("packages/db/prisma/schema.prisma");

describe("database migration integrity", () => {
  it("keeps a complete baseline before applying incremental hardening", () => {
    expect(baseline).toContain('CREATE TABLE "companies"');
    expect(baseline).toContain('CREATE TABLE "invoices"');
    expect(baseline).toContain('CREATE TABLE "payments"');
    expect(baseline).toContain('CREATE TABLE "audit_logs"');
  });

  it("backfills tenant ownership before making it mandatory", () => {
    const assignmentBackfill = domainIntegrity.indexOf(
      'UPDATE "project_assignments"',
    );
    const assignmentNotNull = domainIntegrity.indexOf(
      'ALTER TABLE "project_assignments" ALTER COLUMN "companyId" SET NOT NULL',
    );
    const timesheetBackfill = domainIntegrity.indexOf('UPDATE "timesheets"');
    const timesheetNotNull = domainIntegrity.indexOf(
      'ALTER TABLE "timesheets" ALTER COLUMN "companyId" SET NOT NULL',
    );

    expect(assignmentBackfill).toBeGreaterThan(-1);
    expect(timesheetBackfill).toBeGreaterThan(-1);
    expect(assignmentNotNull).toBeGreaterThan(assignmentBackfill);
    expect(timesheetNotNull).toBeGreaterThan(timesheetBackfill);
  });

  it("rejects cross-tenant legacy relations and installs composite keys", () => {
    expect(domainIntegrity).toContain("IS DISTINCT FROM");
    expect(domainIntegrity).toContain(
      "RAISE EXCEPTION 'Cannot migrate invoices with missing or cross-tenant relations'",
    );
    expect(domainIntegrity).toContain(
      'FOREIGN KEY ("freelancerId", "companyId") REFERENCES "freelancers"("id", "companyId")',
    );
    expect(domainIntegrity).toContain(
      'FOREIGN KEY ("contractId", "companyId") REFERENCES "contracts"("id", "companyId")',
    );
    expect(schema.match(/@@unique\(\[id, companyId\]\)/g)).toHaveLength(4);
  });

  it("enables partial payments and fixed-precision financial columns", () => {
    expect(domainIntegrity).toContain('DROP INDEX "payments_invoiceId_key"');
    expect(domainIntegrity).toContain("DECIMAL(19,4)");
    expect(domainIntegrity).toContain("DECIMAL(7,6)");
    expect(schema).toContain("payments   Payment[]");
    expect(schema).toContain("calculationVersion String");
  });
});
