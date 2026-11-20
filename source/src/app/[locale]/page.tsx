"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/src/i18n/navigation";
import FilterableLayout from "@/src/components/filterable-layout";
import { Announcement, fetchAnnouncements, formatDisplayDate, subscribeToAnnouncements, summarize } from "@/src/lib/announcements";
import { ResourceLink, fetchResourceLinks, subscribeToResourceLinks } from "@/src/lib/resourceLinks";
import { colorForTag } from "@/src/lib/tags";
import { DepartmentOnlyBadge } from "@/src/components/department-only";

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
  sortTime: number; // raw timestamp, used only to sort the mixed feed newest-first
  tags: { label: string; color: string }[];
  departmentOnly: boolean;
};

const TYPE_BADGE: Record<FeedItem["contentType"], string> = {
  Announcement: "bg-orange-100 text-orange-800",
  FAQ: "bg-purple-100 text-purple-800",
  Schedule: "bg-teal-100 text-teal-800",
  Contact: "bg-blue-100 text-blue-800",
  "Resource link": "bg-emerald-100 text-emerald-800",
};

// Announcements and Resource links are fetched below. FAQ/Schedule/Contact
// will be added to this feed once their branches are merged into main.

export default function HomePage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedTags = searchParams.getAll("tag");
  const query = (searchParams.get("query") ?? "").trim().toLowerCase();

  const loadItems = (): void => {
    // Each source is fetched independently, so if one fails the other
    // content type still shows up instead of blanking the whole feed.
    Promise.all([
      fetchAnnouncements().catch((): Announcement[] => []),
      fetchResourceLinks().catch((): ResourceLink[] => []),
    ])
      .then(([announcements, resourceLinks]) => {
        const announcementItems: FeedItem[] = announcements
          .filter((a) => a.status === "ACTIVE")
          .map((a) => ({
            id: a.id,
            contentType: "Announcement",
            href: `/announcements/${a.id}`,
            title: a.title,
            snippet: summarize(a.body),
            body: a.body,
            date: formatDisplayDate(a.startsAt),
            sortTime: a.startsAt ? new Date(a.startsAt).getTime() : 0,
            tags: a.tags.map((tag) => ({ label: tag.name, color: colorForTag(tag) })),
            departmentOnly: a.departmentOnly,
          }));

        // Resource links have no detail page, so the card links through to
        // the Resource links section, where the URL itself is clickable.
        // The URL doubles as the searchable "body" text.
          const resourceLinkItems: FeedItem[] = resourceLinks
            .filter((rl) => rl.status === "ACTIVE")
            .map((rl) => ({
              id: rl.id,
              contentType: "Resource link",
              href: `/resources/${rl.id}`,   // <-- was "/resources"
              title: rl.title,
              snippet: summarize(rl.url),
              body: rl.url,
              date: formatDisplayDate(rl.startsAt),
              sortTime: rl.startsAt ? new Date(rl.startsAt).getTime() : 0,
              tags: rl.tags.map((tag) => ({ label: tag.name, color: colorForTag(tag) })),
              departmentOnly: rl.departmentOnly,
            }));

        setFeedItems([...announcementItems, ...resourceLinkItems].sort((a, b) => b.sortTime - a.sortTime));
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
    const unsubscribeAnnouncements = subscribeToAnnouncements(scheduleReload);
    const unsubscribeResourceLinks = subscribeToResourceLinks(scheduleReload);
    return () => {
      if (timeout) clearTimeout(timeout);
      unsubscribeAnnouncements();
      unsubscribeResourceLinks();
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
                  {item.departmentOnly && <DepartmentOnlyBadge />}
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
                <p className="text-sm text-stone-600 mt-2 leading-relaxed break-words">{item.snippet}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </FilterableLayout>
  );
}