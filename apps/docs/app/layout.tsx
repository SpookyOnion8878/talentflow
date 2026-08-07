import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TalentFlow Documentation",
  description: "Developer documentation for the TalentFlow platform.",
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white font-sans antialiased">{children}</body>
    </html>
  );
}
