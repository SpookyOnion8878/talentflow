-- Verify backfills and fixed-precision conversions on representative legacy rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "project_assignments"
    WHERE "id" = 'assignment-legacy' AND "companyId" = 'company-legacy'
  ) THEN
    RAISE EXCEPTION 'Project assignment company ownership was not backfilled';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "timesheets"
    WHERE "id" = 'timesheet-legacy' AND "companyId" = 'company-legacy'
  ) THEN
    RAISE EXCEPTION 'Timesheet company ownership was not backfilled';
  END IF;

  IF (
    SELECT "budget"::TEXT FROM "projects" WHERE "id" = 'project-legacy'
  ) <> '1000.1250' THEN
    RAISE EXCEPTION 'Project budget precision was not preserved';
  END IF;

  IF (
    SELECT "ratePerHour"::TEXT FROM "contracts" WHERE "id" = 'contract-legacy'
  ) <> '75.1250' THEN
    RAISE EXCEPTION 'Contract rate precision was not preserved';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "invoices"
    WHERE "id" = 'invoice-legacy'
      AND "calculationVersion" = 'invoice-v1'
      AND "taxRate" = 0.11
  ) THEN
    RAISE EXCEPTION 'Invoice calculation metadata was not backfilled';
  END IF;
END $$;

-- The former unique invoice payment constraint must no longer block partial payments.
INSERT INTO "payments" (
  "id", "invoiceId", "amount", "currency", "status", "updatedAt"
)
VALUES (
  'payment-legacy-2', 'invoice-legacy', 50.2500, 'USD', 'COMPLETED',
  CURRENT_TIMESTAMP
);

INSERT INTO "companies" ("id", "name", "slug", "updatedAt")
VALUES ('company-other', 'Other Company', 'other-company', CURRENT_TIMESTAMP);

INSERT INTO "freelancers" (
  "id", "companyId", "firstName", "lastName", "email", "updatedAt"
)
VALUES (
  'freelancer-other', 'company-other', 'Other', 'Freelancer',
  'other@example.test', CURRENT_TIMESTAMP
);

-- Composite foreign keys must reject a cross-tenant assignment.
DO $$
BEGIN
  BEGIN
    INSERT INTO "project_assignments" (
      "id", "projectId", "freelancerId", "companyId"
    )
    VALUES (
      'assignment-cross-tenant', 'project-legacy', 'freelancer-other',
      'company-other'
    );
    RAISE EXCEPTION 'Cross-tenant project assignment was unexpectedly accepted';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;
END $$;

SELECT 'domain integrity migration verification passed' AS result;
