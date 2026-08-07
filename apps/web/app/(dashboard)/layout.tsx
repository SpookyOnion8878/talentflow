import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { caller } from "@/lib/trpc/caller";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "📊" },
  { href: "/dashboard/freelancers", label: "Freelancers", icon: "👥" },
  { href: "/dashboard/projects", label: "Projects", icon: "📁" },
  { href: "/dashboard/contracts", label: "Contracts", icon: "📝" },
  { href: "/dashboard/timesheets", label: "Timesheets", icon: "⏱️" },
  { href: "/dashboard/invoices", label: "Invoices", icon: "💰" },
  { href: "/dashboard/payments", label: "Payments", icon: "💳" },
  { href: "/dashboard/compliance", label: "Compliance", icon: "🛡️" },
  { href: "/dashboard/reports", label: "Reports", icon: "📈" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙️" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const api = await caller();
  const notifications = await api.notification.list({ limit: 10 });

  const initial = (session?.user?.name ?? "U").charAt(0).toUpperCase();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-16 items-center px-6">
          <Link href="/" className="text-xl font-bold text-white">
            TalentFlow
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {session?.user?.name ?? "User"}
              </p>
              <p className="truncate text-xs text-gray-400">
                {session?.user?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            {notifications.unreadCount > 0 && (
              <Link
                href="/dashboard"
                title="You have unread notifications"
                className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <span className="text-xl">🔔</span>
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {notifications.unreadCount > 9
                    ? "9+"
                    : notifications.unreadCount}
                </span>
              </Link>
            )}
            <Link
              href="/api/auth/signout"
              className="rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
            >
              Sign Out
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
