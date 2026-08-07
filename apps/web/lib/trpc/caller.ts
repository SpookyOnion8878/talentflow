import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { appRouter } from "@/lib/trpc/routers";
import { createCaller } from "@/lib/trpc/server";

export async function caller() {
  const session = await getServerSession(authOptions);
  return createCaller(appRouter)({ session });
}
