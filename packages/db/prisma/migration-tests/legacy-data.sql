-- Representative rows created against the baseline schema before domain hardening.
INSERT INTO "users" ("id", "email", "updatedAt")
VALUES ('user-legacy', 'legacy@example.test', CURRENT_TIMESTAMP);

INSERT INTO "companies" ("id", "name", "slug", "updatedAt")
VALUES ('company-legacy', 'Legacy Company', 'legacy-company', CURRENT_TIMESTAMP);

INSERT INTO "freelancers" (
  "id", "companyId", "firstName", "lastName", "email", "updatedAt"
)
VALUES (
  'freelancer-legacy', 'company-legacy', 'Legacy', 'Freelancer',
  'freelancer@example.test', CURRENT_TIMESTAMP
);

INSERT INTO "projects" (
  "id", "companyId", "name", "budget", "currency", "updatedAt"
)
VALUES (
  'project-legacy', 'company-legacy', 'Legacy Project', 1000.125,
  'USD', CURRENT_TIMESTAMP
);

INSERT INTO "project_assignments" (
  "id", "projectId", "freelancerId", "role"
)
VALUES (
  'assignment-legacy', 'project-legacy', 'freelancer-legacy', 'Engineer'
);

INSERT INTO "contracts" (
  "id", "contractNo", "companyId", "freelancerId", "projectId", "title",
  "ratePerHour", "currency", "startDate", "createdBy", "updatedAt"
)
VALUES (
  'contract-legacy', 'CTR-LEGACY-001', 'company-legacy',
  'freelancer-legacy', 'project-legacy', 'Legacy Contract', 75.125,
  'USD', DATE '2026-08-01', 'user-legacy', CURRENT_TIMESTAMP
);

INSERT INTO "timesheets" (
  "id", "freelancerId", "contractId", "projectId", "submittedById", "date",
  "hours", "status", "updatedAt"
)
VALUES (
  'timesheet-legacy', 'freelancer-legacy', 'contract-legacy',
  'project-legacy', 'user-legacy', DATE '2026-08-15', 7.5, 'APPROVED',
  CURRENT_TIMESTAMP
);

INSERT INTO "invoices" (
  "id", "invoiceNo", "companyId", "freelancerId", "contractId", "amount",
  "taxAmount", "totalAmount", "currency", "status", "updatedAt"
)
VALUES (
  'invoice-legacy', 'INV-LEGACY-001', 'company-legacy',
  'freelancer-legacy', 'contract-legacy', 563.4375, 61.978125, 625.415625,
  'USD', 'SENT', CURRENT_TIMESTAMP
);

INSERT INTO "payments" (
  "id", "invoiceId", "amount", "currency", "status", "updatedAt"
)
VALUES (
  'payment-legacy-1', 'invoice-legacy', 100.125, 'USD', 'COMPLETED',
  CURRENT_TIMESTAMP
);
