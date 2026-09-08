"use client";

import { usePathname } from "next/navigation";
import Header from "@/src/components/header";

// Auth screens and the Supabase starter's own protected demo area render
// their own full-page chrome (nav, footer, centered cards) — they opt out
// of the CPSK header and the padded content column applied everywhere else.
function hasOwnChrome(pathname: string | null): boolean {
  return pathname?.startsWith("/auth") || pathname?.startsWith("/protected") || false;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (hasOwnChrome(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
