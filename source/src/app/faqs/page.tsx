"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FilterableLayout from "@/src/components/filterable-layout";
import {
  Faq,
  FaqStatus,
  fetchFaqs,
  formatDisplayDate,
  setFaqActive,
  setFaqArchived,
  deleteFaq,
  subscribeToFaqs,
  summarize,
} from "@/src/lib/faqs";
import { colorForTag } from "@/src/lib/tags";
import { useRole } from "@/src/components/role-context";

const STATUS_BADGE: Record<FaqStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  DRAFT: "bg-stone-200 text-stone-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

export default function FAQsPage() {
  const { user, isStaff } = useRole();

  const [items, setItems] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [confirming, setConfirming] = useState<{ id: string; type: "archive" | "delete" } | null>(null);
  const [publishErrors, setPublishErrors] = useState<Record<string, string>>({});

  const loadItems = (): void => {
    fetchFaqs()
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const scheduleReload = (): void => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(loadItems, 300);
    };

    const unsubscribe = subscribeToFaqs(scheduleReload);
    return () => {
      if (timeout) clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const visibleItems =
    isStaff && scope === "mine"
      ? items.filter((a) => a.creatorId === user?.id)
      : isStaff
        ? items.filter((a) => a.status !== "DRAFT")
        : items.filter((a) => a.status === "ACTIVE");

  const handleArchive = async (faq: Faq): Promise<void> => {
    await setFaqArchived(faq.id);
    setConfirming(null);
    loadItems();
  };

  const handleDeletePermanently = async (id: string): Promise<void> => {
    await deleteFaq(id);
    setConfirming(null);
    loadItems();
  };

  const handlePublish = async (item: Faq): Promise<void> => {
    if (item.tags.length === 0) {
      setPublishErrors((prev) => ({ ...prev, [item.id]: "Select at least one tag before publishing." }));
      return;
    }
    setPublishErrors((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    await setFaqActive(item.id);
    loadItems();
  };

  const handleApplyFilter = (selectedTags: string[]): void => {
    console.log("Applying filter:", selectedTags);
  };

  return (
    <FilterableLayout onApplyFilter={handleApplyFilter}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Frequently Asked Questions</h1>

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
              My FAQs
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-500 text-sm">
          {scope === "mine" ? "You haven't created any FAQs yet." : "No FAQs match your filters right now."}
        </div>
      ) : (
        <ul className="space-y-4">
          {visibleItems.map((f) => (
            <li key={f.id} className="rounded-lg border border-stone-200 bg-white p-4 flex flex-col">
              <Link href={`/faqs/${f.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-base leading-snug">{f.question}</h2>
                  {isStaff && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[f.status]}`}>
                      {f.status}
                    </span>
                  )}
                </div>
                <span className="text-xs text-stone-400 mt-1 block">
                  Posted on {formatDisplayDate(f.createdAt)} by {f.authorName}
                </span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {f.tags.map((tag) => (
                    <span key={tag.id} className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorForTag(tag)}`}>
                      {tag.name}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-stone-600 mt-2 leading-relaxed">{summarize(f.answer)}</p>
              </Link>

              {isStaff && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-stone-100 flex-wrap">
                  {f.status === "DRAFT" && (
                    <button
                      type="button"
                      onClick={() => handlePublish(f)}
                      className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
                    >
                      Publish
                    </button>
                  )}
                  {f.status === "ARCHIVED" && (
                    <button
                      type="button"
                      onClick={() => handlePublish(f)}
                      className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
                    >
                      Restore to Published
                    </button>
                  )}
                  <Link
                    href={`/faqs/${f.id}/edit`}
                    className="text-sm text-teal-700 hover:text-teal-900 font-medium"
                  >
                    Edit
                  </Link>
                  {f.status !== "ARCHIVED" ? (
                    <button
                      type="button"
                      onClick={() => setConfirming({ id: f.id, type: "archive" })}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Archive
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming({ id: f.id, type: "delete" })}
                      className="text-sm text-red-700 hover:text-red-900 font-medium"
                    >
                      Delete Permanently
                    </button>
                  )}
                </div>
              )}

              {publishErrors[f.id] && (
                <div className="mt-2 pt-2 border-t border-stone-100">
                  <p className="text-xs text-red-600">
                    {publishErrors[f.id]}{" "}
                    <Link href={`/faqs/${f.id}/edit`} className="underline hover:text-red-800">
                      Edit to add tags
                    </Link>
                  </p>
                </div>
              )}

              {confirming?.id === f.id && confirming.type === "archive" && (
                <div className="mt-2 pt-2 border-t border-stone-100">
                  <p className="text-xs text-stone-600 mb-2">
                    Archive this FAQ? It will be hidden from students but kept here for reference.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleArchive(f)}
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

              {confirming?.id === f.id && confirming.type === "delete" && (
                <div className="mt-2 pt-2 border-t border-stone-100 bg-red-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
                  <p className="text-xs text-red-700 font-medium mb-2">
                    Permanently delete this FAQ? This cannot be undone — it will be removed completely, not just hidden.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeletePermanently(f.id)}
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