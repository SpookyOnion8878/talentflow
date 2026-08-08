import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <AppShell
      user={{
        name: session?.user?.name ?? "User",
        email: session?.user?.email ?? undefined,
      }}
    >
      {children}
    </AppShell>
  );
}
