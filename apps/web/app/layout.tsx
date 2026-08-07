import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/lib/providers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
