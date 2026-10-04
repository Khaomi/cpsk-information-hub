"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquarePlus, CheckCircle } from "lucide-react";
import FilterableLayout from "@/src/components/filterable-layout";
import {
  Faq,
  FaqStatus,
  fetchFaqs,
  formatDisplayDate,
  setFaqResolved,
  subscribeToFaqs,
  summarize,
} from "@/src/lib/faqs";
import { colorForTag } from "@/src/lib/tags";
import { useRole } from "@/src/components/role-context";

const STATUS_BADGE: Record<FaqStatus, string> = {
  UNANSWERED: "bg-amber-100 text-amber-800",
  ANSWERED: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-emerald-100 text-emerald-800",
};

export default function FAQsPage() {
  const { user, isStaff } = useRole();
  const [items, setItems] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | FaqStatus>("ALL");

  const loadItems = (): void => {
    fetchFaqs()
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
    const unsubscribe = subscribeToFaqs(loadItems);
    return () => unsubscribe();
  }, []);

  const visibleItems = items.filter((f) => {
    if (statusFilter !== "ALL" && f.status !== statusFilter) return false;
    return true;
  });

  const handleToggleResolve = async (faq: Faq) => {
    await setFaqResolved(faq.id, faq.status !== "RESOLVED");
    loadItems();
  };

  return (
    <FilterableLayout onApplyFilter={(tags) => console.log(tags)}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Questions & FAQs</h1>
          <p className="text-sm text-stone-500">Ask questions anonymously or browse resolved topics.</p>
        </div>

        <Link
          href="/faqs/ask"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
        >
          <MessageSquarePlus className="w-4 h-4" />
          Ask a Question
        </Link>
      </div>

      <div className="flex gap-2 border-b border-stone-200 mb-4 overflow-x-auto pb-1">
        {(["ALL", "UNANSWERED", "ANSWERED", "RESOLVED"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
              statusFilter === status
                ? "border-b-2 border-teal-600 text-teal-700 font-semibold"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-stone-500">Loading questions...</p>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-500 text-sm">
          No questions found under this filter.
        </div>
      ) : (
        <ul className="space-y-4">
          {visibleItems.map((f) => {
            const displayName =
              isStaff || f.authorId === user?.id
                ? `${f.authorName} ${f.isAnonymous ? "(Posted Anonymously)" : ""}`
                : f.isAnonymous
                ? "Anonymous Student"
                : f.authorName;

            return (
              <li key={f.id} className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm hover:border-stone-300 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/faqs/${f.id}`} className="group flex-1">
                    <h2 className="font-semibold text-base text-stone-900 group-hover:text-teal-700 transition-colors">
                      {f.question}
                    </h2>
                  </Link>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[f.status]}`}>
                    {f.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-stone-400 mt-1">
                  <span>Asked by <strong className="text-stone-600">{displayName}</strong></span>
                  <span>•</span>
                  <span>{formatDisplayDate(f.createdAt)}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {f.tags?.map((tag) => (
                    <span key={tag.id} className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorForTag(tag)}`}>
                      {tag.name}
                    </span>
                  ))}
                </div>

                {f.answer && (
                  <p className="text-sm text-stone-600 mt-3 bg-stone-50 p-3 rounded-md border-l-2 border-teal-500">
                    <strong className="text-stone-800 block text-xs mb-1">Answer:</strong>
                    {summarize(f.answer)}
                  </p>
                )}

                {isStaff && (
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100 text-xs">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleResolve(f)}
                        className={`inline-flex items-center gap-1 font-medium ${
                          f.status === "RESOLVED" ? "text-stone-500" : "text-emerald-700 hover:text-emerald-900"
                        }`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {f.status === "RESOLVED" ? "Reopen Question" : "Mark as Resolved"}
                      </button>
                      <Link href={`/faqs/${f.id}`} className="text-teal-700 hover:underline">
                        Reply / Edit Answer
                      </Link>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </FilterableLayout>
  );
}