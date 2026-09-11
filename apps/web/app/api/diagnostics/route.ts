import { NextResponse } from "next/server";
import { prisma } from "@repo/db";

export const dynamic = "force-dynamic";

/**
 * Minimal deployment diagnostic — verifies the environment the server
 * actually sees at runtime. Reports presence/shape only, never values, so
 * the endpoint leaks no configuration. Intentionally NOT in globalEnv
 * secret lists; safe to expose (it outputs booleans).
 */
export async function GET() {
  const checks = {
    server: { ok: true, nodeEnv: process.env.NODE_ENV ?? "unknown" },
    databaseUrl: {
      present: Boolean(process.env.DATABASE_URL),
      looksLikePostgres: (process.env.DATABASE_URL ?? "").startsWith(
        "postgresql://",
      ),
    },
    nextAuth: {
      url: process.env.NEXTAUTH_URL ?? "(unset)",
      secret: {
        present: Boolean(process.env.NEXTAUTH_SECRET),
        length: process.env.NEXTAUTH_SECRET?.length ?? 0,
        strong: (process.env.NEXTAUTH_SECRET?.length ?? 0) >= 32,
      },
    },
    cron: {
      secret: {
        present: Boolean(process.env.CRON_SECRET),
        lengthOk: (process.env.CRON_SECRET?.length ?? 0) >= 32,
      },
    },
    ai: {
      provider: process.env.MODEL_PROVIDER ?? "(unset)",
      geminiKey: { present: Boolean(process.env.GEMINI_API_KEY) },
    },
    app: {
      publicUrl: process.env.NEXT_PUBLIC_APP_URL ?? "(unset)",
    },
    database: {
      reachable: false,
      users: 0,
      error: "not probed",
    },
  };

  const fatal: string[] = [];
  if (!checks.databaseUrl.present || !checks.databaseUrl.looksLikePostgres) {
    fatal.push("DATABASE_URL missing or not a postgresql:// URL");
  }
  if (!checks.nextAuth.secret.strong) {
    fatal.push("NEXTAUTH_SECRET missing or shorter than 32 chars");
  }

  // Live DB probe: reachable? seeded? (timeboxed so the endpoint can't hang)
  try {
    const users = await Promise.race([
      prisma.user.count(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000),
      ),
    ]);
    checks.database = { reachable: true, users };
    if (users === 0) {
      fatal.push(
        "database reachable but EMPTY — run `pnpm db:migrate` + `pnpm db:seed`",
      );
    }
  } catch (error) {
    checks.database = {
      reachable: false,
      error: error instanceof Error ? error.message.slice(0, 200) : "unknown",
    };
    fatal.push(
      "database unreachable (connection error — check DATABASE_URL host/SSL)",
    );
  }

  return NextResponse.json(
    { ok: fatal.length === 0, fatal, checks },
    {
      status: fatal.length === 0 ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
