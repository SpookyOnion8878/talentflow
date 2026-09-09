# Database migration workflow

The migration history is the source of truth for production schema changes.
Do not use `prisma db push` against shared or production databases.

## Fresh database

Run `pnpm db:deploy`. Prisma applies the baseline followed by every incremental migration.

## Existing database created with `db push`

1. Take a verified database backup.
2. Confirm the database matches the pre-Phase-1 schema represented by `20260817000000_baseline`.
3. Mark only the baseline as already applied:
   `pnpm --filter @repo/db exec prisma migrate resolve --applied 20260817000000_baseline`
4. Run `pnpm db:deploy` to apply `20260817010000_domain_integrity`.

The domain-integrity migration backfills tenant columns and aborts if legacy rows contain missing or cross-tenant relations. Repair those rows from the backup-reviewed source of truth before retrying.

Use `pnpm db:migrate` only for local development when creating a new migration. Use `pnpm db:status` to inspect migration drift before deployment.
