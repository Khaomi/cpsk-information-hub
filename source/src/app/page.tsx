"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FilterableLayout from "@/src/components/filterable-layout";
import { fetchAnnouncements, formatDisplayDate, summarize } from "@/src/lib/announcements";
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
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
            date: formatDisplayDate(a.startsAt),
            tags: a.tags.map((tag) => ({ label: tag.name, color: colorForTag(tag) })),
          }));
        setFeedItems(items);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleApplyFilter = (selectedTags: string[]): void => {
    // TODO: call the combined home-feed endpoint filtered by tag
    console.log("Applying filter:", selectedTags);
  };

  return (
    <FilterableLayout onApplyFilter={handleApplyFilter}>
      <h1 className="text-2xl font-bold mb-4">Latest News</h1>

      {loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : feedItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-500 text-sm">
          No content matches your filters right now.
        </div>
      ) : (
        <ul className="space-y-4">
          {feedItems.map((item) => (
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
