import Link from "next/link";

const sections = [
  {
    title: "Introduction",
    description: "Overview, features, and quickstart guide",
    href: "#introduction",
  },
  {
    title: "Architecture",
    description: "System design, monorepo structure, and ERD",
    href: "#architecture",
  },
  {
    title: "API Reference",
    description: "tRPC endpoints with request/response examples",
    href: "#api",
  },
  {
    title: "Authentication",
    description: "OAuth flow, JWT, and RBAC setup",
    href: "#auth",
  },
  {
    title: "Deployment",
    description: "Vercel setup, env variables, and database migration",
    href: "#deploy",
  },
  {
    title: "Contributing",
    description: "Code style, branching strategy, and PR template",
    href: "#contributing",
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-50 border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xl font-bold text-blue-600">
              TalentFlow
            </Link>
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              Docs
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/yourusername/talentflow"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              GitHub
            </Link>
            <Link
              href="http://localhost:3000"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              App
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="text-4xl font-bold text-gray-900">
          TalentFlow Documentation
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Everything you need to understand, develop, and deploy TalentFlow.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => (
            <Link
              key={s.title}
              href={s.href}
              className="group rounded-xl border p-6 hover:border-blue-300 hover:shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600">
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600">{s.description}</p>
            </Link>
          ))}
        </div>

        <section id="introduction" className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900">Introduction</h2>
          <p className="mt-4 text-gray-600 leading-relaxed">
            TalentFlow is a B2B SaaS platform for managing freelancers and
            contractors. It provides end-to-end lifecycle management including
            contracts, timesheets, invoicing, compliance tracking, and payment
            processing. Built with Next.js, Prisma, and PostgreSQL, leveraging a
            monorepo architecture with Turborepo.
          </p>
        </section>

        <section id="architecture" className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900">Architecture</h2>
          <p className="mt-4 text-gray-600 leading-relaxed">
            TalentFlow uses a Turborepo monorepo with the following structure:
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-gray-900 p-6 text-sm text-green-400">
            {`talentflow/
├── apps/
│   ├── web/          # Next.js 14 (Frontend + API + tRPC)
│   └── docs/         # Documentation site
├── packages/
│   ├── db/           # Prisma schema + client
│   ├── ui/           # Shared React components
│   ├── validators/   # Zod schemas
│   ├── utils/        # Utility functions
│   └── email/        # React Email templates
└── .github/workflows/  # CI/CD`}
          </pre>
        </section>

        <section id="api" className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900">API Reference</h2>
          <p className="mt-4 text-gray-600">
            TalentFlow uses tRPC for type-safe API communication. All endpoints
            are defined as tRPC routers with Zod validation.
          </p>
          <div className="mt-6 space-y-4">
            {[
              {
                method: "query",
                endpoint: "freelancer.list",
                desc: "List all freelancers with pagination",
              },
              {
                method: "query",
                endpoint: "freelancer.getById",
                desc: "Get freelancer by ID",
              },
              {
                method: "mutation",
                endpoint: "freelancer.create",
                desc: "Create a new freelancer",
              },
              {
                method: "mutation",
                endpoint: "timesheet.submit",
                desc: "Submit a new timesheet",
              },
              {
                method: "mutation",
                endpoint: "timesheet.approve",
                desc: "Approve a pending timesheet",
              },
              {
                method: "mutation",
                endpoint: "invoice.create",
                desc: "Generate invoice from timesheets",
              },
              {
                method: "mutation",
                endpoint: "contract.sign",
                desc: "Record e-signature",
              },
            ].map((api) => (
              <div
                key={api.endpoint}
                className="flex items-start gap-3 rounded-lg border p-4"
              >
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold ${api.method === "query" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}
                >
                  {api.method.toUpperCase()}
                </span>
                <div>
                  <code className="text-sm font-medium text-gray-900">
                    {api.endpoint}
                  </code>
                  <p className="mt-0.5 text-xs text-gray-500">{api.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="deploy" className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900">Deployment</h2>
          <p className="mt-4 text-gray-600 leading-relaxed">
            TalentFlow deploys to Vercel with GitHub Actions CI/CD. The
            deployment pipeline runs linting, type checking, unit tests, and
            builds before deploying to production.
          </p>
        </section>
      </div>
    </div>
  );
}
