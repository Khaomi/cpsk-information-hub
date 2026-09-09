import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider } from "next-themes";
import { Geist } from "next/font/google";
import type { Metadata } from "next";
import { Suspense } from "react";
import AppShell from "@/src/components/app-shell";
import { MobileFiltersProvider } from "@/src/components/mobile-filters-context";
import { RoleProvider } from "@/src/components/role-context";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "CPSK — Department Information & Communication Hub",
  description: "The fastest way to build apps with Next.js and Supabase",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <Analytics />
        <SpeedInsights />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <RoleProvider>
            <MobileFiltersProvider>
              <Suspense fallback={null}>
                <AppShell>{children}</AppShell>
              </Suspense>
            </MobileFiltersProvider>
          </RoleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
