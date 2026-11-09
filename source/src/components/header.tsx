"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

// Pages that currently read ?query= and filter their own content.
// Add to this list as FAQs/Schedules/etc. get keyword search wired up.
const SEARCHABLE_PATHS = ["/announcements", "/resources"];

export default function Header() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { open: openMobileFilters } = useMobileFilters();
  const { user, role, isStaff } = useRole();
  // Tag management is admin-only (SRS US-14 / SRS-11 / AD-5)
  const isAdmin = role === "admin";

  const submitSearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const params = new URLSearchParams(window.location.search);
    if (query.trim()) params.set("q", query.trim());
    else params.delete("q");
    router.push(`${pathname}?${params.toString()}`);
  };

  // Only reconcile with the URL on pages that actually support search.
  // - If we already have a typed keyword (e.g. carried over from a page
  //   that doesn't search yet) and this page's URL doesn't have it,
  //   apply it here so the newly-arrived page actually filters.
  // - If the URL already has a query (e.g. a shared link) and the box
  //   is empty, reflect that in the box.
  useEffect(() => {
    if (!SEARCHABLE_PATHS.includes(pathname)) return;

    const urlQuery = searchParams.get("query") ?? "";
    if (query && query !== urlQuery) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("query", query);
      router.replace(`${pathname}?${params.toString()}`);
    } else if (!query && urlQuery) {
      setQuery(urlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleAccountClick = async (): Promise<void> => {
    if (!user) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  // Updates ?query= on the current page, but only if this page is set up
  // to read it. On pages that aren't searchable yet, this is a no-op.
  const runSearch = (term: string): void => {
    if (!SEARCHABLE_PATHS.includes(pathname)) return;

    const params = new URLSearchParams(searchParams.toString());
    if (term) {
      params.set("query", term);
    } else {
      params.delete("query");
    }
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleQueryChange = (value: string): void => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 300);
  };

  const handleSearchSubmit = (): void => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    runSearch(query);
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
          {isAdmin && (
            <Link
              href="/tags"
              className="flex items-center gap-1 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
            >
              <span className="hidden sm:inline">{t("header.tags")}</span>
            </Link>
          )}
          <LocaleSwitcher />
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

          <form onSubmit={submitSearch} className="flex items-center gap-2 py-2">
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearchSubmit();
              }}
              placeholder="Search..."
              className="w-32 sm:w-48 lg:w-72 rounded-md border-0 bg-white/90 px-3 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-white/70"
            />
            <button
              type="button"
              onClick={handleSearchSubmit}
              aria-label="Search"
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
          </form>
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