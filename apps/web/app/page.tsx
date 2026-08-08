import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  Zap,
  Briefcase,
  Users,
  FileText,
  Timer,
  ReceiptText,
  ShieldCheck,
  BarChart3,
  Check,
  Plus,
} from "lucide-react";
import { clsx } from "clsx";

const features = [
  {
    title: "Freelancer Management",
    description:
      "Centralize all freelancer data, skills, ratings, and compliance documents in one place.",
    icon: Users,
  },
  {
    title: "Smart Contracts",
    description:
      "Generate contracts from templates with dynamic variables, e-signatures, and versioning.",
    icon: FileText,
  },
  {
    title: "Time Tracking",
    description:
      "Freelancers submit timesheets, managers approve with one click. Real-time budget tracking.",
    icon: Timer,
  },
  {
    title: "Auto Invoicing",
    description:
      "Generate invoices from approved timesheets automatically. Multi-currency support.",
    icon: ReceiptText,
  },
  {
    title: "Compliance Engine",
    description:
      "Track documents, auto-expiry alerts, country-specific rules. Stay compliant effortlessly.",
    icon: ShieldCheck,
  },
  {
    title: "Analytics & Reports",
    description:
      "Budget forecasting, spending analytics, freelancer utilization, and exportable reports.",
    icon: BarChart3,
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
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-lg shadow-primary-500/25">
        <Zap className="h-5 w-5 text-white" fill="currentColor" />
      </span>
      <span className="text-xl font-bold tracking-tight text-slate-900">
        TalentFlow
      </span>
    </Link>
  );
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const signedIn = !!session?.user;

  return (
    <div className="flex min-h-screen flex-col">
      {/* ─── Navigation ─── */}
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <div className="hidden items-center gap-8 md:flex">
            {[
              { href: "#features", label: "Features" },
              { href: "#pricing", label: "Pricing" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {signedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
              >
                <BarChart3 className="h-4 w-4" />
                Open Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-grid [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,black,transparent)]" />
        <div className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-primary-400/15 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 text-center sm:px-6 sm:pt-28 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
            <Plus className="h-3 w-3" />
            Now with a fully redesigned dashboard
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold !tracking-tight text-slate-900 sm:text-6xl">
            Manage Freelancers{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">
              Like a Pro
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            The all-in-one platform for managing freelancers and contractors.
            Contracts, timesheets, invoicing, compliance, and payments —
            automated end-to-end.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={signedIn ? "/dashboard" : "/register"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-500/30 transition-colors hover:bg-primary-700 sm:w-auto"
            >
              {signedIn ? "Open Dashboard" : "Start Free — No Credit Card"}
              <Zap className="h-4 w-4" fill="currentColor" />
            </Link>
            <Link
              href="#features"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 sm:w-auto"
            >
              <Briefcase className="h-4 w-4" />
              See Features
            </Link>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {[
              { value: "500+", label: "Companies" },
              { value: "10,000+", label: "Freelancers" },
              { value: "4.9/5", label: "Avg. rating" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold tracking-tight text-slate-900">
                  {stat.value}
                </p>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="relative py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary-600">
              Features
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Everything You Need
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              From onboarding to payment, TalentFlow handles the entire
              freelancer lifecycle.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-colors group-hover:bg-primary-600 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary-600">
              Pricing
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Start free. Scale as you grow. No hidden fees.
            </p>
          </div>
          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={clsx(
                  "relative rounded-2xl border bg-white p-8 transition-all",
                  plan.highlight
                    ? "border-primary-600 shadow-xl shadow-primary-500/10 ring-1 ring-primary-600"
                    : "border-slate-200 shadow-card hover:shadow-card-hover",
                )}
              >
                {plan.highlight && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-gradient px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-slate-900">
                  {plan.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                    {plan.price}
                  </span>
                  <span className="text-sm text-slate-500">{plan.period}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {plan.description}
                </p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2.5 text-sm text-slate-700"
                    >
                      <span
                        className={clsx(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                          plan.highlight
                            ? "bg-primary-100 text-primary-700"
                            : "bg-emerald-100 text-emerald-600",
                        )}
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={clsx(
                    "mt-8 block rounded-lg py-3 text-center text-sm font-semibold transition-colors",
                    plan.highlight
                      ? "bg-primary-600 text-white shadow-sm hover:bg-primary-700"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="px-4 pb-24 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-sidebar px-6 py-16 text-center sm:px-16">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-500/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" />
          <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to streamline your freelance workforce?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-slate-400">
            Join hundreds of companies managing their freelancers with
            TalentFlow — no credit card required.
          </p>
          <Link
            href={signedIn ? "/dashboard" : "/register"}
            className="relative mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-primary-700 shadow-lg transition-colors hover:bg-primary-50"
          >
            {signedIn ? "Go to Dashboard" : "Get Started Free"}
            <Zap className="h-4 w-4" fill="currentColor" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Logo />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
                The modern freelancer management platform for companies that
                value efficiency.
              </p>
            </div>
            {[
              {
                title: "Product",
                links: ["Features", "Pricing", "Changelog"],
                hrefs: ["#features", "#pricing", "#"],
              },
              {
                title: "Company",
                links: ["About", "Blog", "Careers"],
                hrefs: ["#", "#", "#"],
              },
              {
                title: "Legal",
                links: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
                hrefs: ["#", "#", "#"],
              },
            ].map((col) => (
              <div key={col.title}>
                <h5 className="text-sm font-semibold text-slate-900">
                  {col.title}
                </h5>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link, i) => (
                    <li key={link}>
                      <a
                        href={col.hrefs[i]}
                        className="text-sm text-slate-500 transition-colors hover:text-slate-900"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 border-t border-slate-200 pt-8 text-center text-sm text-slate-400">
            © {new Date().getFullYear()} TalentFlow. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
