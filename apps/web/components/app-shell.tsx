"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Folder,
  Briefcase,
  Timer,
  ReceiptText,
  CreditCard,
  ShieldCheck,
  BarChart3,
  Settings,
  Zap,
  Menu,
  LogOut,
  Bot,
  ListChecks,
  History,
  SlidersHorizontal,
} from "lucide-react";
import { clsx } from "clsx";
import { NotificationCenter } from "./notification-center";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/freelancers", label: "Freelancers", icon: Users },
  { href: "/dashboard/projects", label: "Projects", icon: Folder },
  { href: "/dashboard/contracts", label: "Contracts", icon: Briefcase },
  { href: "/dashboard/timesheets", label: "Timesheets", icon: Timer },
  { href: "/dashboard/invoices", label: "Invoices", icon: ReceiptText },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { href: "/dashboard/compliance", label: "Compliance", icon: ShieldCheck },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

const agentNavItems = [
  { href: "/dashboard/agents/copilot", label: "Ops Copilot", icon: Bot },
  {
    href: "/dashboard/agents/queue",
    label: "Approval Queue",
    icon: ListChecks,
  },
  { href: "/dashboard/agents/activity", label: "Activity Log", icon: History },
  {
    href: "/dashboard/agents/config",
    label: "Config",
    icon: SlidersHorizontal,
  },
] as const;

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/freelancers": "Freelancers",
  "/dashboard/projects": "Projects",
  "/dashboard/contracts": "Contracts",
  "/dashboard/timesheets": "Timesheets",
  "/dashboard/invoices": "Invoices",
  "/dashboard/payments": "Payments",
  "/dashboard/compliance": "Compliance",
  "/dashboard/reports": "Reports",
  "/dashboard/settings": "Settings",
  "/dashboard/agents/copilot": "Ops Copilot",
  "/dashboard/agents/queue": "Approval Queue",
  "/dashboard/agents/activity": "Activity Log",
  "/dashboard/agents/config": "Agent Config",
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

function Logo() {
  return (
    <Link href="/dashboard" className="group flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-lg shadow-primary-600/25 transition-transform group-hover:scale-105">
        <Zap className="h-5 w-5 text-white" fill="currentColor" />
      </span>
      <span className="text-lg font-bold tracking-tight text-white">
        TalentFlow
      </span>
    </Link>
  );
}

function SidebarContent({
  pathname,
  user,
  onNavigate,
}: {
  pathname: string;
  user: { name: string; email?: string; initial: string };
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={clsx(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-primary-500/10 text-sidebar-active ring-1 ring-inset ring-primary-400/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
              )}
            >
              <Icon
                className={clsx(
                  "h-[18px] w-[18px] transition-colors",
                  active
                    ? "text-primary-400"
                    : "text-slate-500 group-hover:text-slate-300",
                )}
              />
              {item.label}
            </Link>
          );
        })}

        <p className="px-3 pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-slate-500">
          AI Agents
        </p>
        {agentNavItems.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={clsx(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-primary-500/10 text-sidebar-active ring-1 ring-inset ring-primary-400/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
              )}
            >
              <Icon
                className={clsx(
                  "h-[18px] w-[18px] transition-colors",
                  active
                    ? "text-primary-400"
                    : "text-slate-500 group-hover:text-slate-300",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
            {user.initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {user.name}
            </p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>
          <Link
            href="/api/auth/signout"
            title="Sign out"
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: { name: string; email?: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initial = (user.name ?? "U").charAt(0).toUpperCase();
  const title =
    TITLES[pathname] ??
    Object.entries(TITLES).find(
      ([path]) => path !== "/dashboard" && pathname.startsWith(path),
    )?.[1] ??
    "Dashboard";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar lg:flex">
        <SidebarContent pathname={pathname} user={{ ...user, initial }} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar shadow-2xl">
            <SidebarContent
              pathname={pathname}
              user={{ ...user, initial }}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-4 shadow-topbar backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <NotificationCenter />
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-xs font-semibold text-white ring-2 ring-white">
              {initial}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
