"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/src/i18n/navigation";
import FilterableLayout from "@/src/components/filterable-layout";
import { fetchAnnouncements, formatDisplayDate, subscribeToAnnouncements, summarize } from "@/src/lib/announcements";
import { colorForTag } from "@/src/lib/tags";

// A single mixed-feed item, regardless of which content type it came from.
// Each real item still lives in its own table (Announcement, FAQ, Schedule, ...);
// this is just the shape used to render them together on the home feed.
type FeedItem = {
  id: string;
  contentType: "Announcement" | "FAQ" | "Schedule" | "Contact" | "Resource link";
  href: string; // which section page this links through to
  title: string;
  snippet: string;
  body: string; // full text, used for keyword search (snippet is truncated)
  date: string;
  tags: { label: string; color: string }[];
};

const TYPE_BADGE: Record<FeedItem["contentType"], string> = {
  Announcement: "bg-orange-100 text-orange-800",
  FAQ: "bg-purple-100 text-purple-800",
  Schedule: "bg-teal-100 text-teal-800",
  Contact: "bg-blue-100 text-blue-800",
  "Resource link": "bg-emerald-100 text-emerald-800",
};

// FAQ/Schedule/Contact/Resource link have no real tables yet (see /new,
// where those content types are still "Coming soon"), so only the
// Announcement portion of this feed is real — fetched below.

export default function HomePage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedTags = searchParams.getAll("tag");
  const query = searchParams.get("q")?.trim().toLowerCase() ?? "";

  const loadItems = (): void => {
    fetchAnnouncements()
      .then((announcements) => {
        const items: FeedItem[] = announcements
          .filter((a) => a.status === "ACTIVE")
          .map((a) => ({
            id: a.id,
            contentType: "Announcement",
            href: `/announcements/${a.id}`,
            title: a.title,
            snippet: summarize(a.body),
            body: a.body,
            date: formatDisplayDate(a.startsAt),
            tags: a.tags.map((tag) => ({ label: tag.name, color: colorForTag(tag) })),
          }));
        setFeedItems(items);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const scheduleReload = (): void => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(loadItems, 300);
    };
    const unsubscribe = subscribeToAnnouncements(scheduleReload);
    return () => {
      if (timeout) clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const handleApplyFilter = (selectedTags: string[]): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tag");
    selectedTags.forEach((tag) => params.append("tag", tag));
    router.push(`${pathname}?${params.toString()}`);
  };

  // US-12: show items whose tags include at least one selected tag.
  // US-16: case-insensitive keyword match on title/body (and tag names).
  const visibleItems = feedItems.filter((item) => {
    const matchesTags = selectedTags.length === 0 || item.tags.some((itemTag) => selectedTags.includes(itemTag.label));
    const matchesQuery =
      !query ||
      item.title.toLowerCase().includes(query) ||
      item.body.toLowerCase().includes(query) ||
      item.tags.some((tag) => tag.label.toLowerCase().includes(query));
    return matchesTags && matchesQuery;
  });

  return (
    <FilterableLayout onApplyFilter={handleApplyFilter}>
      <h1 className="text-2xl font-bold mb-4">{t("common.latestNews")}</h1>

      {loading ? (
        <p className="text-sm text-stone-500">{t("common.loading")}</p>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-500 text-sm">
          {t("home.empty")}
        </div>
      ) : (
        <ul className="space-y-4">
          {visibleItems.map((item) => (
            <li key={`${item.contentType}-${item.id}`} className="rounded-lg border border-stone-200 bg-white p-4 hover:border-stone-300 transition-colors">
              <Link href={item.href}>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${TYPE_BADGE[item.contentType]}`}>
                    {item.contentType}
                  </span>
                </div>
                <h2 className="font-semibold text-base leading-snug mt-1.5">{item.title}</h2>
                <span className="text-xs text-stone-400 mt-1 block">{item.date}</span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {item.tags.map((tag) => (
                    <span key={tag.label} className={`text-xs font-medium px-2 py-0.5 rounded-full ${tag.color}`}>
                      {tag.label}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-stone-600 mt-2 leading-relaxed">{item.snippet}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </FilterableLayout>
  );
}
