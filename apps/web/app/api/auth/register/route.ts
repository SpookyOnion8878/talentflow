import { NextResponse } from "next/server";
import { prisma } from "@repo/db";
import { Prisma } from "@repo/db";
import { registerSchema } from "@repo/validators";
import { hashPassword, slugify } from "@repo/utils";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    if (!checkRateLimit("register:global", 100, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const { name, email, password, companyName } = parsed.data;

    if (
      !checkRateLimit(
        `register:email:${email.trim().toLowerCase()}`,
        5,
        60 * 60 * 1000,
      ) ||
      (ip !== "unknown" &&
        !checkRateLimit(`register:ip:${ip}`, 10, 60 * 60 * 1000))
    ) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 },
      );
    }

    const baseSlug = slugify(companyName) || "company";
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    let user;
    try {
      user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            name,
            email,
            password: hashPassword(password),
            role: "ADMIN",
          },
        });

        const company = await tx.company.create({
          data: {
            name: companyName,
            slug,
            industry: "Technology",
          },
        });

        await tx.membership.create({
          data: {
            userId: created.id,
            companyId: company.id,
            role: "OWNER",
            status: "ACTIVE",
            joinedAt: new Date(),
          },
        });

        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 409 },
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error("Registration failed:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
