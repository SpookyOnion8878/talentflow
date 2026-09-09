"use client";

import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/toast";
import { TRPCProvider } from "./trpc/provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <TRPCProvider>{children}</TRPCProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
