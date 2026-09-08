"use client";

import { useState } from "react";
import Link from "next/link";
import FilterableLayout from "@/src/components/filterable-layout";
import { ANNOUNCEMENTS, Announcement, CURRENT_STAFF_NAME, summarize } from "@/src/lib/announcements";
import { useRole } from "@/src/components/role-context";

const STATUS_BADGE: Record<Announcement["status"], string> = {
  published: "bg-emerald-100 text-emerald-800",
  draft: "bg-stone-200 text-stone-700",
  archived: "bg-red-100 text-red-700",
};

export default function AnnouncementsPage() {
  const { role } = useRole();
  const isStaff = role === "staff" || role === "admin";

  const [items, setItems] = useState<Announcement[]>(ANNOUNCEMENTS);
  const [scope, setScope] = useState<"all" | "mine">("all");
  // confirming: which item's confirmation box is open, and for which action
  const [confirming, setConfirming] = useState<{ id: string; type: "archive" | "delete" } | null>(null);
  const [publishErrors, setPublishErrors] = useState<Record<string, string>>({});

  const visibleItems =
    isStaff && scope === "mine"
      ? items.filter((a) => a.author === CURRENT_STAFF_NAME)
      : items.filter((a) => a.status === "published");

  const handleArchive = (id: string): void => {
    // TODO: replace with a real API call once the backend is connected
    setItems((prev) => prev.map((a) => (a.id === id ? { ...a, status: "archived" } : a)));
    setConfirming(null);
  };

  const handleDeletePermanently = (id: string): void => {
    // TODO: replace with a real API call (hard delete) once the backend is connected.
    // Only ever reachable from the "archived" state — see the button logic below.
    setItems((prev) => prev.filter((a) => a.id !== id));
    setConfirming(null);
  };

  // Shared by "quick publish" (draft → published) and "restore" (archived → published).
  // SRS-9 still applies in both directions: at least one tag is required.
  const handlePublish = (item: Announcement): void => {
    if (item.tags.length === 0) {
      setPublishErrors((prev) => ({ ...prev, [item.id]: "Select at least one tag before publishing." }));
      return;
    }
    setPublishErrors((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    // TODO: replace with a real API call once the backend is connected
    setItems((prev) => prev.map((a) => (a.id === item.id ? { ...a, status: "published" } : a)));
  };

  const handleApplyFilter = (selectedTags: string[]): void => {
    console.log("Applying filter:", selectedTags);
  };

  return (
    <FilterableLayout onApplyFilter={handleApplyFilter}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Latest News</h1>

        {isStaff && (
          <div className="flex rounded-md border border-stone-300 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setScope("all")}
              className={`px-3 py-1.5 transition-colors ${
                scope === "all" ? "bg-teal-600 text-white" : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setScope("mine")}
              className={`px-3 py-1.5 transition-colors ${
                scope === "mine" ? "bg-teal-600 text-white" : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              My Announcements
            </button>
          </div>
        )}
      </div>

      {visibleItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-500 text-sm">
          {scope === "mine" ? "You haven't created any announcements yet." : "No announcements match your filters right now."}
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleItems.map((a) => (
            <li key={a.id} className="rounded-lg border border-stone-200 bg-white p-4 flex flex-col h-full">
              <Link href={`/announcements/${a.id}`} className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-base leading-snug">{a.title}</h2>
                  {isStaff && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[a.status]}`}>
                      {a.status}
                    </span>
                  )}
                </div>
                <span className="text-xs text-stone-400 mt-1 block">
                  Posted on {a.publishedDate} by {a.author}
                </span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {a.tags.map((tag) => (
                    <span key={tag.label} className={`text-xs font-medium px-2 py-0.5 rounded-full ${tag.color}`}>
                      {tag.label}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-stone-600 mt-2 leading-relaxed">{summarize(a.body)}</p>
              </Link>

              {isStaff && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-stone-100 flex-wrap">
                  {a.status === "draft" && (
                    <button
                      type="button"
                      onClick={() => handlePublish(a)}
                      className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
                    >
                      Publish
                    </button>
                  )}
                  {a.status === "archived" && (
                    <button
                      type="button"
                      onClick={() => handlePublish(a)}
                      className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
                    >
                      Restore to Published
                    </button>
                  )}
                  <Link
                    href={`/announcements/${a.id}/edit`}
                    className="text-sm text-teal-700 hover:text-teal-900 font-medium"
                  >
                    Edit
                  </Link>
                  {a.status !== "archived" ? (
                    <button
                      type="button"
                      onClick={() => setConfirming({ id: a.id, type: "archive" })}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming({ id: a.id, type: "delete" })}
                      className="text-sm text-red-700 hover:text-red-900 font-medium"
                    >
                      Delete Permanently
                    </button>
                  )}
                </div>
              )}

              {publishErrors[a.id] && (
                <div className="mt-2 pt-2 border-t border-stone-100">
                  <p className="text-xs text-red-600">
                    {publishErrors[a.id]}{" "}
                    <Link href={`/announcements/${a.id}/edit`} className="underline hover:text-red-800">
                      Edit to add tags
                    </Link>
                  </p>
                </div>
              )}

              {confirming?.id === a.id && confirming.type === "archive" && (
                <div className="mt-2 pt-2 border-t border-stone-100">
                  <p className="text-xs text-stone-600 mb-2">
                    Archive this item? It will be hidden from students but kept here for reference.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleArchive(a.id)}
                      className="text-xs font-medium bg-red-600 text-white rounded px-3 py-1.5 hover:bg-red-700 transition-colors"
                    >
                      Yes, archive
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="text-xs font-medium border border-stone-300 rounded px-3 py-1.5 hover:bg-stone-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {confirming?.id === a.id && confirming.type === "delete" && (
                <div className="mt-2 pt-2 border-t border-stone-100 bg-red-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
                  <p className="text-xs text-red-700 font-medium mb-2">
                    Permanently delete this item? This cannot be undone — it will be removed completely, not just hidden.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeletePermanently(a.id)}
                      className="text-xs font-medium bg-red-700 text-white rounded px-3 py-1.5 hover:bg-red-800 transition-colors"
                    >
                      Yes, delete permanently
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="text-xs font-medium border border-stone-300 rounded px-3 py-1.5 hover:bg-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </FilterableLayout>
  );
}
