"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/src/i18n/navigation";
import { LogOut, Search, User, ChevronDown, SlidersHorizontal, Plus } from "lucide-react";
import { useMobileFilters } from "@/src/components/mobile-filters-context";
import { useRole } from "@/src/components/role-context";
import { createClient } from "@/src/lib/supabase/client";
import LocaleSwitcher from "@/src/components/locale-switcher";

type NavItem = {
  labelKey: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { labelKey: "header.nav.all", href: "/" },
  { labelKey: "header.nav.announcements", href: "/announcements" },
  { labelKey: "header.nav.faqs", href: "/faqs" },
  { labelKey: "header.nav.schedules", href: "/schedules" },
  { labelKey: "header.nav.contacts", href: "/contacts" },
  { labelKey: "header.nav.resources", href: "/resources" },
];

export default function Header() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const { open: openMobileFilters } = useMobileFilters();
  const { user, isStaff } = useRole();

  const handleAccountClick = async (): Promise<void> => {
    if (!user) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <header className="bg-white border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-tight">CPSK</span>
          <span className="hidden sm:inline text-sm text-stone-500">
            {t("common.tagline")}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Centralized "+ New" — visible from any page, asks which content
              type to create before routing to that type's form (see /new) */}
          {isStaff && (
            <Link
              href="/new"
              className="flex items-center gap-1 rounded-md bg-teal-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t("header.new")}</span>
            </Link>
          )}
          <LocaleSwitcher />
          {user ? (
            <button
              type="button"
              onClick={handleAccountClick}
              aria-label={t("header.account.signOut")}
              title={user.displayName ?? user.email ?? t("header.account.signOut")}
              className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
            >
              <LogOut className="w-4 h-4 text-stone-600" />
            </button>
          ) : (
            <Link
              href="/auth/login"
              aria-label={t("header.account.signIn")}
              className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
            >
              <User className="w-4 h-4 text-stone-600" />
            </Link>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-orange-400 to-teal-500">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          {/* Real Next.js routing — <Link> navigates, no state switcher needed */}
          <nav className="hidden sm:flex items-center gap-1 text-sm font-medium">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2.5 transition-colors ${
                  pathname === item.href
                  ? "text-white border-b-2 border-white font-semibold"
                  : "text-white/80 hover:text-white"
                }`}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setMobileNavOpen((v) => !v)}
            className="sm:hidden py-2.5 text-sm font-medium text-white flex items-center gap-1"
          >
            {(() => {
              const current = NAV_ITEMS.find((i) => i.href === pathname);
              return current ? t(current.labelKey) : t("header.mobile.menuFallback");
            })()}
            <ChevronDown className={`w-4 h-4 transition-transform ${mobileNavOpen ? "rotate-180" : ""}`} />
          </button>

          <div className="flex items-center gap-2 py-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("header.search.placeholder")}
              className="w-32 sm:w-48 lg:w-72 rounded-md border-0 bg-white/90 px-3 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-white/70"
            />
            <button
              type="button"
              aria-label={t("header.search.ariaLabel")}
              className="w-8 h-8 shrink-0 rounded-md bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
            >
              <Search className="w-4 h-4 text-stone-700" />
            </button>
            <button
              type="button"
              onClick={openMobileFilters}
              aria-label={t("header.filters.ariaLabel")}
              className="w-8 h-8 shrink-0 rounded-md bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4 text-stone-700" />
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <nav className="sm:hidden flex flex-col bg-teal-600/95 text-sm font-medium">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileNavOpen(false)}
                className={`px-4 py-2.5 ${pathname === item.href ? "text-white bg-white/10 font-semibold" : "text-white/85"}`}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
