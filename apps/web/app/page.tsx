import Link from "next/link";

const features = [
  {
    title: "Freelancer Management",
    description:
      "Centralize all freelancer data, skills, ratings, and compliance documents in one place.",
    icon: "👥",
  },
  {
    title: "Smart Contracts",
    description:
      "Generate contracts from templates with dynamic variables, e-signatures, and versioning.",
    icon: "📝",
  },
  {
    title: "Time Tracking",
    description:
      "Freelancers submit timesheets, managers approve with one click. Real-time budget tracking.",
    icon: "⏱️",
  },
  {
    title: "Auto Invoicing",
    description:
      "Generate invoices from approved timesheets automatically. Multi-currency support.",
    icon: "💰",
  },
  {
    title: "Compliance Engine",
    description:
      "Track documents, auto-expiry alerts, country-specific rules. Stay compliant effortlessly.",
    icon: "🛡️",
  },
  {
    title: "Analytics & Reports",
    description:
      "Budget forecasting, spending analytics, freelancer utilization, and exportable reports.",
    icon: "📊",
  },
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "For small teams getting started",
    features: [
      "Up to 5 freelancers",
      "Basic contracts",
      "Timesheet tracking",
      "Email support",
    ],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    description: "For growing companies",
    features: [
      "Unlimited freelancers",
      "Smart contracts & e-signatures",
      "Auto invoicing",
      "Compliance dashboard",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/month",
    description: "For large organizations",
    features: [
      "Everything in Pro",
      "Custom workflows",
      "Advanced analytics",
      "SSO & SAML",
      "Dedicated account manager",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ─── Navigation ─── */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-2xl font-bold text-primary-600">
            TalentFlow
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Pricing
            </a>
            <a
              href="https://docs.talentflow.dev"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Docs
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-white py-24">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
            Manage Freelancers
            <br />
            <span className="text-primary-600">Like a Pro</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            The all-in-one platform for managing freelancers and contractors.
            Contracts, timesheets, invoicing, compliance, and payments —
            automated end-to-end.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-xl bg-primary-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-primary-700"
            >
              Start Free — No Credit Card
            </Link>
            <Link
              href="#features"
              className="rounded-xl border border-gray-300 px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50"
            >
              See Features
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Trusted by 500+ companies • 10,000+ freelancers managed
          </p>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Everything You Need
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              From onboarding to payment, TalentFlow handles the entire
              freelancer lifecycle.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-gray-200 p-8 transition-shadow hover:shadow-lg"
              >
                <div className="text-4xl">{feature.icon}</div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing Section ─── */}
      <section id="pricing" className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Start free. Scale as you grow. No hidden fees.
            </p>
          </div>
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-8 ${
                  plan.highlight
                    ? "border-primary-600 bg-white shadow-xl ring-2 ring-primary-600"
                    : "border-gray-200 bg-white"
                }`}
              >
                {plan.highlight && (
                  <span className="mb-4 inline-block rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">
                    Most Popular
                  </span>
                )}
                <h3 className="text-2xl font-bold text-gray-900">
                  {plan.name}
                </h3>
                <div className="mt-4">
                  <span className="text-4xl font-extrabold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-500">{plan.period}</span>
                </div>
                <p className="mt-2 text-gray-600">{plan.description}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-gray-700"
                    >
                      <span className="text-green-500">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`mt-8 block rounded-lg py-3 text-center text-sm font-semibold ${
                    plan.highlight
                      ? "bg-primary-600 text-white hover:bg-primary-700"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t bg-gray-900 py-12 text-gray-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h4 className="text-lg font-bold text-white">TalentFlow</h4>
              <p className="mt-2 text-sm">
                The modern freelancer management platform for companies that
                value efficiency.
              </p>
            </div>
            <div>
              <h5 className="font-semibold text-white">Product</h5>
              <ul className="mt-2 space-y-2 text-sm">
                <li>
                  <a href="#features" className="hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Changelog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-white">Company</h5>
              <ul className="mt-2 space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Careers
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-semibold text-white">Legal</h5>
              <ul className="mt-2 space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-800 pt-8 text-center text-sm">
            © {new Date().getFullYear()} TalentFlow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
