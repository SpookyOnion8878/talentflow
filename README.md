# TalentFlow

> **Freelancer & Contractor Management Platform** — End-to-end lifecycle management for modern companies.

[![CI/CD](https://github.com/yourusername/talentflow/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/talentflow/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-black)](https://talentflow.vercel.app)

---

## Table of Contents

- [Overview](#overview)
- [Business Value](#business-value)
- [Features](#features)
- [AI Agents (AgentOps)](#ai-agents-agentops)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Entity Relationship Diagram (ERD)](#entity-relationship-diagram-erd)
- [Use Cases](#use-cases)
- [Workflows](#workflows)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

TalentFlow is a B2B SaaS platform that helps companies manage their entire freelancer and contractor workforce from a single platform. It automates the complete lifecycle — from onboarding and contract management to time tracking, invoicing, compliance, and payments.

### The Problem

- 73% of Fortune 500 companies use contractors, yet most manage them through spreadsheets and email
- Compliance risks from expired documents, missing contracts, and untracked hours
- Manual invoicing leads to errors, delays, and budget overruns
- No centralized visibility into freelancer spend and utilization

### The Solution

A unified platform with:

- **Centralized freelancer database** with skills, ratings, and compliance records
- **Smart contract engine** with templates, e-signatures, and versioning
- **Automated timesheets** with approval workflows and real-time budget tracking
- **Auto-generated invoices** from approved hours with multi-currency support
- **Compliance dashboard** with auto-expiry alerts and verification workflows
- **Analytics & forecasting** for spend optimization and utilization tracking

---

## Business Value

| Metric              | Impact                                                       |
| ------------------- | ------------------------------------------------------------ |
| **Time Saved**      | 15+ hours/week per company on admin tasks                    |
| **Error Reduction** | 90% fewer invoicing errors through automation                |
| **Compliance Risk** | 95%+ compliance score with automated tracking                |
| **Cost Visibility** | Real-time budget tracking across all projects                |
| **Revenue Model**   | SaaS subscription: Free / Pro ($29/mo) / Enterprise ($99/mo) |
| **Market Size**     | Global gig economy: $455B by 2027                            |
| **Target Market**   | Mid-size to enterprise companies using 5+ freelancers        |

---

## Features

### Core Features

- **Freelancer Management** — CRUD, skills, ratings, bank info, tax details
- **Project Management** — Create projects, assign freelancers, track budgets
- **Smart Contracts** — Template-based generation, e-signatures, version history
- **Time Tracking** — Daily timesheet submission, manager approval workflow
- **Auto Invoicing** — Generate from approved timesheets, multi-currency (USD, EUR, IDR)
- **Payment Tracking** — Record payments via bank transfer, Stripe, PayPal, Wise
- **Compliance Engine** — Document tracking (ID, tax, visa, NDA), auto-expiry alerts
- **Audit Trail** — Immutable log of all actions with timestamps and actors

### Advanced Features

- **Budget Forecasting** — Predict spend based on burn rate and projected hours
- **Role-Based Access Control** — Owner, Admin, Manager, Finance, Viewer roles
- **Real-time Notifications** — WebSocket alerts for approvals, payments, expiry
- **Analytics Dashboard** — Spending trends, utilization rates, invoice aging
- **Export Reports** — PDF and CSV export for financial and compliance reports
- **Multi-currency** — Auto-conversion with exchange rate integration

### AI Agents (AgentOps)

An orchestration engine + AI copilot for business operations, built on the existing tRPC/Prisma/RBAC stack:

- **Agent engine** (`packages/agents`) — orchestrated runs, tool registry, guardrails, approval queue, audit logging
- **Billing Agent** — probes timesheets, detects unapproved entries, proposes invoice pre-checks
- **Compliance Agent** — scans document expiry, flags near-expiry and expired compliance records
- **AI Ops Copilot** — router + Gemini/Ollama providers, auto/manual approval modes, `general_question` RAG
- **RAG pipeline** — company data ingested into **pgvector** embeddings (`text-embedding-004` / `nomic-embed-text` / deterministic mock), top-k retrieval for chat
- **Hardening** — unique `(tool, idempotencyKey)` constraint, duplicate-safe budget check pre-check, cost dashboard with token budget & 80% alert
- **UI** — `/dashboard/agents/*` pages (dashboard, activity, config, copilot, queue) with English UI

Docs: [`docs/agents/`](docs/agents/00-README.md) (PRD, architecture, ERD, roadmap).

---

## Tech Stack

| Layer              | Technology                        | Cost           |
| ------------------ | --------------------------------- | -------------- |
| **Monorepo**       | Turborepo                         | Free           |
| **Frontend**       | Next.js 14 (App Router)           | Free           |
| **Styling**        | Tailwind CSS + Custom Components  | Free           |
| **Backend API**    | tRPC (type-safe)                  | Free           |
| **Database**       | PostgreSQL (via Supabase)         | Free tier      |
| **ORM**            | Prisma                            | Free           |
| **Authentication** | NextAuth.js (OAuth + Credentials) | Free           |
| **Email**          | Resend (React Email)              | Free (3000/mo) |
| **File Storage**   | Supabase Storage                  | Free (1GB)     |
| **Payments**       | Stripe (test mode)                | Free (test)    |
| **Validation**     | Zod                               | Free           |
| **CI/CD**          | GitHub Actions                    | Free           |
| **Hosting**        | Vercel                            | Free (hobby)   |
| **Documentation**  | Next.js (custom docs)             | Free           |
| **Testing**        | Vitest + Playwright               | Free           |
| **Linting**        | ESLint + Prettier + Husky         | Free           |
| **AI Agents**      | Gemini / Ollama / mock + pgvector | Free ($0 tier) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│  Next.js App Router ── React Server Components + Client Comp.  │
├─────────────────────────────────────────────────────────────────┤
│                      tRPC API Layer                             │
│  Type-safe endpoints with Zod validation                        │
├─────────────────────────────────────────────────────────────────┤
│                    BUSINESS LOGIC                                │
│  Freelancer │ Project │ Contract │ Timesheet │ Invoice │ Payment│
├─────────────────────────────────────────────────────────────────┤
│                    DATA ACCESS (Prisma ORM)                     │
│  Connection pooling │ Migrations │ Type generation              │
├─────────────────────────────────────────────────────────────────┤
│                    PostgreSQL (Supabase)                         │
│  Primary database │ Realtime subscriptions │ File storage       │
└─────────────────────────────────────────────────────────────────┘
```

### Monorepo Structure

```
talentflow/
├── apps/
│   ├── web/                    # Next.js 14 App (Frontend + tRPC API)
│   │   ├── app/
│   │   │   ├── (auth)/         # Login, Register pages
│   │   │   ├── (dashboard)/    # Dashboard with sidebar layout
│   │   │   │   ├── dashboard/          # Overview page
│   │   │   │   ├── freelancers/        # Freelancer CRUD
│   │   │   │   ├── projects/           # Project management
│   │   │   │   ├── contracts/          # Contract engine
│   │   │   │   ├── timesheets/         # Time tracking
│   │   │   │   ├── invoices/           # Auto invoicing
│   │   │   │   ├── payments/           # Payment tracking
│   │   │   │   ├── compliance/         # Compliance dashboard
│   │   │   │   ├── reports/            # Analytics & reports
│   │   │   │   └── settings/           # Account & team settings
│   │   │   └── api/trpc/       # tRPC API handler
│   │   └── lib/trpc/routers/   # tRPC router definitions
│   └── docs/                   # Documentation site
├── packages/
│   ├── db/                     # Prisma schema + client
│   ├── ui/                     # Shared UI components
│   ├── validators/             # Zod validation schemas
│   ├── utils/                  # Shared utility functions
│   ├── email/                  # React Email templates
│   ├── eslint-config/          # Shared ESLint config
│   └── typescript-config/      # Shared TypeScript config
├── .github/workflows/          # CI/CD pipelines
├── turbo.json                  # Turborepo config
└── package.json                # Root workspace config
```

---

## Entity Relationship Diagram (ERD)

```
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│   Company   │───────│    Membership    │───────│    User     │
│─────────────│       │──────────────────│       │─────────────│
│ id (PK)     │       │ id (PK)          │       │ id (PK)     │
│ name        │       │ company_id (FK)  │       │ email       │
│ slug        │       │ user_id (FK)     │       │ name        │
│ plan        │       │ role             │       │ role        │
│ settings    │       │ status           │       │ password    │
└──────┬──────┘       └──────────────────┘       └──────┬──────┘
       │ 1:N                                            │ 1:1
       ▼                                                ▼
┌─────────────┐       ┌──────────────────┐       ┌─────────────┐
│  Freelancer  │◄──────│    Contract      │──────►│   Account   │
│─────────────│       │──────────────────│       │  (OAuth)    │
│ id (PK)     │       │ id (PK)          │       └─────────────┘
│ company_id  │       │ freelancer_id    │
│ user_id     │       │ project_id       │
│ first_name  │       │ rate_per_hour    │
│ last_name   │       │ currency         │
│ email       │       │ start_date       │
│ skills[]    │       │ end_date         │
│ country     │       │ status           │
│ currency    │       │ terms (JSON)     │
│ tax_id      │       │ signed_by (FK)   │
│ bank_info   │       │ created_by (FK)  │
│ status      │       └────────┬─────────┘
│ rating      │                │ 1:N
└──────┬──────┘                ▼
       │ 1:N          ┌──────────────────┐
       ▼              │     Invoice      │
┌─────────────┐       │──────────────────│
│  Timesheet   │       │ id (PK)          │
│─────────────│       │ invoice_no       │
│ id (PK)     │       │ company_id (FK)  │
│ freelancer  │       │ freelancer_id    │
│ contract_id │       │ contract_id      │
│ project_id  │       │ amount           │
│ date        │       │ tax_amount       │
│ hours       │       │ total_amount     │
│ description │       │ currency         │
│ status      │       │ status           │
│ approved_by │       │ due_date         │
└─────────────┘       │ paid_at          │
       │              │ items (JSON[])   │
       ▼              └────────┬─────────┘
┌─────────────┐                │ 1:1
│   Project    │                ▼
│─────────────│       ┌──────────────────┐
│ id (PK)     │       │    Payment       │
│ company_id  │       │──────────────────│
│ name        │       │ id (PK)          │
│ description │       │ invoice_id (FK)  │
│ status      │       │ amount           │
│ budget      │       │ method           │
│ start_date  │       │ status           │
│ end_date    │       │ reference        │
└─────────────┘       └──────────────────┘

Additional Entities:
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ ComplianceRecord │  │    AuditLog      │  │   Notification   │
│──────────────────│  │──────────────────│  │──────────────────│
│ freelancer_id    │  │ company_id       │  │ user_id          │
│ type             │  │ user_id          │  │ title            │
│ document_url     │  │ action           │  │ message          │
│ expiry_date      │  │ entity           │  │ type             │
│ status           │  │ entity_id        │  │ read             │
│ verified_by      │  │ metadata (JSON)  │  │ metadata (JSON)  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## Use Cases

### Actor: Company Admin

| ID    | Use Case            | Priority | Description                                                           |
| ----- | ------------------- | -------- | --------------------------------------------------------------------- |
| UC-01 | Register Company    | P0       | Create account and setup company profile                              |
| UC-02 | Invite Team Members | P0       | Invite users with role-based access (Admin, Manager, Finance, Viewer) |
| UC-03 | Manage Freelancers  | P0       | Add, edit, deactivate freelancers with full profile data              |
| UC-04 | Create Projects     | P0       | Create projects with budget, timeline, and freelancer assignments     |
| UC-05 | Generate Contracts  | P1       | Auto-generate contracts from templates with dynamic variables         |
| UC-06 | Approve Timesheets  | P0       | Review and approve/reject freelancer time entries                     |
| UC-07 | Generate Invoices   | P1       | Auto-generate invoices from approved timesheets (hours × rate)        |
| UC-08 | Track Budgets       | P1       | Real-time budget tracking per project with burn rate analysis         |
| UC-09 | Verify Compliance   | P1       | Upload and verify documents (ID, tax, work permit, NDA)               |
| UC-10 | Export Reports      | P2       | Generate PDF/CSV reports for finance and compliance                   |
| UC-11 | Manage Subscription | P2       | Upgrade/downgrade plan, manage billing                                |

### Actor: Freelancer (Limited Portal)

| ID    | Use Case         | Priority | Description                                  |
| ----- | ---------------- | -------- | -------------------------------------------- |
| UC-12 | Submit Timesheet | P0       | Log daily hours with project and description |
| UC-13 | View Invoices    | P1       | See invoice status and payment history       |
| UC-14 | Sign Contract    | P1       | Digital signature on assigned contracts      |
| UC-15 | Upload Documents | P1       | Submit compliance documents for verification |
| UC-16 | Update Profile   | P0       | Edit personal info, bank details, and skills |

### Actor: System (Automated)

| ID    | Use Case        | Priority | Description                                            |
| ----- | --------------- | -------- | ------------------------------------------------------ |
| UC-17 | Email Reminders | P2       | Send reminders for pending timesheets, due invoices    |
| UC-18 | Tax Calculation | P2       | Auto-calculate tax based on freelancer country         |
| UC-19 | Audit Logging   | P1       | Record all actions with timestamp, actor, and metadata |
| UC-20 | Rate Limiting   | P0       | Prevent API abuse with rate limiting middleware        |

---

## Workflows

### 1. Freelancer Onboarding Flow

```
[Admin invites Freelancer via email]
        │
        ▼
[Freelancer registers & completes profile]
        │
        ▼
[Admin assigns Freelancer to Project]
        │
        ▼
[System generates Contract from template]
        │
        ▼
[Freelancer reviews & digitally signs Contract]
        │
        ▼
[Admin uploads compliance documents]
        │
        ▼
[System verifies documents & activates Freelancer]
```

### 2. Timesheet → Invoice → Payment Flow

```
[Freelancer submits daily Timesheet]
        │
        ▼
[Manager receives notification]
        │
        ├──► [Approve] ──► [Hours added to billing period]
        │
        └──► [Reject] ──► [Freelancer notified with reason]
                            │
                            ▼
                   [Freelancer revises & resubmits]

[End of billing period]
        │
        ▼
[System auto-generates Invoice]
    (approved hours × rate per hour)
        │
        ▼
[Invoice sent to Finance for review]
        │
        ▼
[Finance confirms Payment]
        │
        ▼
[System updates budget tracking]
    + [Email receipt to Freelancer]
    + [Audit log entry created]
```

### 3. Compliance Monitoring Flow

```
[Document uploaded] ──► [Status: PENDING]
        │
        ▼
[Admin reviews document]
        │
        ├──► [Verify] ──► [Status: VERIFIED] ──► [Set expiry monitoring]
        │
        └──► [Reject] ──► [Status: REJECTED] ──► [Request re-upload]

[30 days before expiry]
        │
        ▼
[System sends warning email]
        │
        ▼
[On expiry date] ──► [Status: EXPIRED] ──► [Block new timesheets]
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 9
- **PostgreSQL with pgvector extension** (`pgvector/pgvector:pg16` image) — required for the AI Agents RAG pipeline

### Quick DB with pgvector (Docker)

```bash
docker run -d --name tf-pg \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -v tf_pg_data:/var/lib/postgresql/data \
  pgvector/pgvector:pg16

# One-time setup
docker exec -i tf-pg psql -U postgres -d postgres -c "CREATE EXTENSION IF NOT EXISTS vector"
```

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/talentflow.git
cd talentflow
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your database URL and secrets
```

### 3. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database
pnpm db:push

# Push with data-loss override (needed when schema changes drop/alter columns)
pnpm db:push --accept-data-loss

# Seed with demo data
pnpm db:seed

# Open Prisma Studio (optional)
pnpm db:studio
```

### 4. AI Agents Setup

```bash
cp .env.example .env.local
# Fill in: MODEL_PROVIDER (gemini | ollama | mock), GEMINI_API_KEY, CRON_SECRET
# MODEL_FAST / MODEL_DEEP / OLLAMA_BASE_URL are optional defaults

# End-to-end smoke: engine + DB + RAG against seeded data
pnpm --filter @repo/agents smoke

# Optional: re-ingest company embeddings via UI
# Dashboard → Agent Config → "Reindex embeddings"
```

### 4. Start Development

```bash
# Start all apps and packages
pnpm dev

# Or start specific apps
pnpm --filter @repo/web dev     # Web app on :3000
pnpm --filter @repo/docs dev    # Docs on :3001
```

### 5. Start Development

```bash
# Start all apps and packages
pnpm dev

# Or start specific apps
pnpm --filter @repo/web dev     # Web app on :3000
pnpm --filter @repo/docs dev    # Docs on :3001
```

### 6. Access the App

- **Web App**: [http://localhost:3000](http://localhost:3000)
- **Agent Dashboard**: [http://localhost:3000/dashboard/agents](http://localhost:3000/dashboard/agents)
- **Cron endpoint** (daily agent runs; unauthorized by default): `GET /api/cron/agents` with `Authorization: Bearer $CRON_SECRET`
- **Prisma Studio**: [http://localhost:5555](http://localhost:5555)

---

## Project Structure

### Key Directories

| Path                        | Description                                                 |
| --------------------------- | ----------------------------------------------------------- |
| `apps/web/app/(auth)/`      | Authentication pages (login, register)                      |
| `apps/web/app/(dashboard)/` | Protected dashboard pages                                   |
| `apps/web/lib/trpc/`        | tRPC server setup and routers                               |
| `apps/web/app/api/trpc/`    | tRPC API route handler                                      |
| `packages/db/prisma/`       | Database schema and migrations                              |
| `packages/validators/src/`  | Shared Zod validation schemas                               |
| `packages/ui/src/`          | Shared React UI components                                  |
| `packages/utils/src/`       | Shared utility functions                                    |
| `packages/email/src/`       | React Email templates                                       |
| `packages/agents/`          | AgentOps engine: engine, jobs, tools, RAG, providers, tests |

---

## API Reference

All API endpoints are defined as tRPC routers with full type safety.

### Available Routers

| Router       | Endpoint     | Type     | Description                           |
| ------------ | ------------ | -------- | ------------------------------------- |
| `freelancer` | `list`       | query    | Paginated freelancer list with search |
| `freelancer` | `getById`    | query    | Get single freelancer details         |
| `freelancer` | `create`     | mutation | Add new freelancer                    |
| `freelancer` | `update`     | mutation | Update freelancer profile             |
| `freelancer` | `delete`     | mutation | Remove freelancer                     |
| `project`    | `list`       | query    | List all projects                     |
| `project`    | `create`     | mutation | Create new project                    |
| `contract`   | `list`       | query    | List all contracts                    |
| `contract`   | `create`     | mutation | Generate new contract                 |
| `contract`   | `sign`       | mutation | Record e-signature                    |
| `timesheet`  | `list`       | query    | List timesheets with status filter    |
| `timesheet`  | `submit`     | mutation | Submit new timesheet                  |
| `timesheet`  | `approve`    | mutation | Approve pending timesheet             |
| `timesheet`  | `reject`     | mutation | Reject with reason                    |
| `invoice`    | `list`       | query    | List all invoices                     |
| `invoice`    | `create`     | mutation | Generate invoice from timesheets      |
| `invoice`    | `markAsPaid` | mutation | Record payment                        |

---

## Deployment

### Vercel Deployment

1. Push to GitHub
2. Connect repo to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard (see below)
4. Deploy — Vercel auto-detects Next.js apps

> **Production database**: use a managed PostgreSQL with the **pgvector** extension —
> [Neon](https://neon.tech) (recommended, pgvector built-in) or [Supabase](https://supabase.com).
> `pnpm db:push --accept-data-loss` once against the prod DB, seed if desired, and reindex
> agent embeddings from the Agent Config page after deploy.
> Vercel Cron (see `vercel.json`) calls `/api/cron/agents` daily/weekly with `CRON_SECRET`.

### Environment Variables (Production)

```
DATABASE_URL=postgresql://...   # Neon/Supabase (pgvector) — NOT localhost
NEXTAUTH_URL=https://talentflow.vercel.app
NEXTAUTH_SECRET=<generated-secret>
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
STRIPE_SECRET_KEY=sk_live_...
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_URL=https://talentflow.vercel.app
# AI Agents — production (fall back to mock provider when unset)
MODEL_PROVIDER=gemini
GEMINI_API_KEY=<Gemini API key — format baru "AQ.Ab..." (AI Studio)>
MODEL_FAST=gemini-2.5-flash
MODEL_DEEP=gemini-2.5-flash
OLLAMA_BASE_URL=http://localhost:11434
CRON_SECRET=<generated-secret>
```

Set the same secrets in **GitHub Actions** (`.github/workflows/ci.yml`): `DATABASE_URL`,
`NEXTAUTH_SECRET`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_WEB_PROJECT_ID`.

### CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs:

1. **Lint & Type Check** — ESLint + TypeScript
2. **Unit Tests** — Vitest
3. **Build** — All apps and packages
4. **Deploy** — Auto-deploy to Vercel on main branch

---

## Contributing

### Branching Strategy

- `main` — Production-ready code
- `develop` — Integration branch
- `feature/*` — New features
- `fix/*` — Bug fixes

### Commit Convention

```
feat: add freelancer search filter
fix: correct invoice tax calculation
docs: update API reference for contracts
refactor: extract budget calculation utility
test: add timesheet approval tests
```

### Code Style

- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- Husky pre-commit hooks for lint-staged
- Conventional Commits enforced

---

## Roadmap

### Phase 1 (Weeks 1-2) — Foundation

- [x] Monorepo setup with Turborepo
- [x] Prisma schema with full ERD
- [x] Authentication (NextAuth + OAuth)
- [x] Dashboard layout with sidebar
- [x] Freelancer CRUD pages

### Phase 2 (Weeks 3-4) — Core Workflows

- [ ] Contract engine with templates
- [ ] Timesheet submission & approval
- [ ] tRPC API integration
- [ ] Real-time notifications

### Phase 3 (Weeks 5-6) — Finance

- [ ] Auto invoice generation
- [ ] Payment tracking
- [ ] Budget forecasting
- [ ] Multi-currency support

### Phase 4 (Weeks 7-8) — Compliance & Analytics

- [ ] Compliance document tracking
- [ ] Auto-expiry alerts
- [ ] Analytics dashboard
- [ ] Export reports (PDF/CSV)

### Phase 5 (Weeks 9-10) — Polish

- [ ] E2E testing with Playwright
- [ ] Documentation site
- [ ] Landing page optimization
- [ ] Vercel production deployment

### AgentOps (AI Agents) — Done

- [x] Agent engine: orchestration, tool registry, guardrails, approval queue, audit logging
- [x] Billing & Compliance agents + AI Ops Copilot (Gemini/Ollama/mock)
- [x] RAG pipeline with pgvector embeddings + chat retrieval
- [x] Idempotency hardening, stress tests, cost dashboard with budget alerts
- [x] Dashboard UI + cron endpoint + 30 unit tests + end-to-end smoke script

Blueprint & roadmap: [`docs/agents/`](docs/agents/00-README.md).

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ using Next.js, Prisma, and Turborepo<br/>
  <strong>TalentFlow</strong> — Managing Freelancers Like a Pro
</p>
