"use client";

import Link from "next/link";
import FilterableLayout from "@/src/components/filterable-layout";

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

// Placeholder data — replace with a real fetch that combines all five
// content tables, e.g. a small "home feed" API route that queries
// Announcement, FAQ, Schedule, Contact, ResourceLink in parallel
// (same Promise.all pattern discussed for the search feature) and
// returns the most recent N items across all of them.
const FEED_ITEMS: FeedItem[] = [
  {
    id: "1",
    contentType: "Announcement",
    href: "/announcements/1",
    title: "IUP Orientation 2026",
    snippet: "The Orientation on Saturday, 18 July 2026 at Building 17 Room 201...",
    date: "17 July 2026",
    tags: [
      { label: "Year 1", color: "bg-yellow-200 text-yellow-900" },
      { label: "Meeting", color: "bg-teal-200 text-teal-900" },
    ],
  },
  {
    id: "2",
    contentType: "Schedule",
    href: "/schedules",
    title: "CS101 Midterm",
    snippet: "September 3, 2026 — Room 301, 9:00 AM",
    date: "16 July 2026",
    tags: [{ label: "CS101", color: "bg-teal-200 text-teal-900" }],
  },
  {
    id: "3",
    contentType: "FAQ",
    href: "/faqs",
    title: "Where is my lab?",
    snippet: "Lab assignments are posted on the Schedules page under your course code...",
    date: "15 July 2026",
    tags: [{ label: "General", color: "bg-purple-200 text-purple-900" }],
  },
];

export default function HomePage() {
  const handleApplyFilter = (selectedTags: string[]): void => {
    // TODO: call the combined home-feed endpoint filtered by tag
    console.log("Applying filter:", selectedTags);
  };

  return (
    <FilterableLayout onApplyFilter={handleApplyFilter}>
      <h1 className="text-2xl font-bold mb-4">Latest News</h1>

      {FEED_ITEMS.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-500 text-sm">
          No content matches your filters right now.
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEED_ITEMS.map((item) => (
            <li key={`${item.contentType}-${item.id}`}>
              <Link
                href={item.href}
                className="block h-full text-left rounded-lg border border-stone-200 bg-white p-4 hover:border-stone-300 transition-colors flex flex-col"
              >
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${TYPE_BADGE[item.contentType]}`}>
                    {item.contentType}
                  </span>
                </div>
                <h2 className="font-semibold text-base leading-snug mt-1.5">{item.title}</h2>
                <span className="text-xs text-stone-400 mt-1">{item.date}</span>
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
