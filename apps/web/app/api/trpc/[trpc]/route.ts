import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { getServerSession } from "next-auth";
import { appRouter } from "@/lib/trpc/routers";
import { authOptions } from "@/lib/auth";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => ({
      session: await getServerSession(authOptions),
    }),
    onError: ({ error, path }) => {
      if (
        process.env.NODE_ENV !== "production" ||
        error.code === "INTERNAL_SERVER_ERROR"
      ) {
        console.error(`tRPC error on ${path ?? "(unknown)"}:`, error);
      }
    },
  });

export { handler as GET, handler as POST };
