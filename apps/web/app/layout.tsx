import { cookies } from "next/headers";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "TalentFlow - Freelancer Management Platform",
  description:
    "Manage freelancers, contracts, timesheets, invoices, and compliance in one platform. Built for modern companies.",
  keywords: [
    "freelancer",
    "management",
    "invoicing",
    "timesheet",
    "compliance",
    "SaaS",
  ],
  authors: [{ name: "TalentFlow" }],
  openGraph: {
    title: "TalentFlow - Freelancer Management Platform",
    description:
      "End-to-end freelancer & contractor management for modern companies.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const theme =
    (await cookies()).get("tf_theme")?.value === "dark" ? "dark" : "";

  return (
    <html lang="en" className={theme} suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
