"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import FilterableLayout from "@/src/components/filterable-layout";
import {
  Faq,
  FaqStatus,
  deleteFaq,
  fetchFaqs,
  formatDisplayDate,
  setFaqResolved,
  subscribeToFaqs,
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
  const searchParams = useSearchParams();
  const query = (searchParams.get("query") ?? "").trim().toLowerCase();

  const t = useTranslations();
  const [items, setItems] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | FaqStatus>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<{ id: string; type: "delete" } | null>(null);

  const loadItems = (): void => {
    fetchFaqs()
      .then(setItems)
      .catch((err) => {
        console.error("Failed to load FAQs:", err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
    const unsubscribe = subscribeToFaqs(loadItems);
    return () => unsubscribe();
  }, []);

  const visibleItems = items.filter((f) => {
    if (statusFilter !== "ALL" && f.status !== statusFilter) return false;

    if (query) {
      const matchesQuery =
        f.question.toLowerCase().includes(query) ||
        (f.description ?? "").toLowerCase().includes(query);
      if (!matchesQuery) return false;
    }

    return true;
  });

  const handleToggleResolve = async (faq: Faq) => {
    try {
      await setFaqResolved(faq.id, faq.status !== "RESOLVED");
      loadItems();
    } catch (err: unknown) {
      console.error("Failed to update FAQ status:", err);
      const errMessage = err instanceof Error ? err.message : "Failed to update question status.";
      alert(errMessage);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await deleteFaq(id);
      setConfirming(null);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: unknown) {
      console.error("Failed to delete FAQ:", err);
      const errMessage = err instanceof Error ? err.message : "Failed to delete question.";
      alert(errMessage);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <FilterableLayout onApplyFilter={() => {}}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">{t("faqs.heading")}</h1>
          <p className="text-sm text-stone-500">{t("faqs.subheading")}</p>
        </div>

        <Link
          href="/faqs/ask"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium text-sm transition-colors shadow-sm"
        >
          <MessageSquarePlus className="w-4 h-4" />
          {t("faqs.askButton")}
        </Link>
      </div>

      <div className="flex gap-2 border-b border-stone-200 mb-4 overflow-x-auto pb-1">
        {(["ALL", "UNANSWERED", "ANSWERED", "RESOLVED"] as const).map((status) => {
          const scopeKeyMap: Record<string, string> = {
            ALL: t("faqs.statuses.ALL"),
            UNANSWERED: t("faqs.statuses.UNANSWERED"),
            ANSWERED: t("faqs.statuses.ANSWERED"),
            RESOLVED: t("faqs.statuses.RESOLVED"),
          };

          return (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
                statusFilter === status
                  ? "border-b-2 border-teal-600 text-teal-700 font-semibold"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              {scopeKeyMap[status]}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm text-stone-500">{t("common.loading")}</p>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-500 text-sm">
          {query ? t("faqs.emptySearch") : t("faqs.empty")}
        </div>
      ) : (
        <ul className="space-y-4">
          {visibleItems.map((f) => {
            const displayName =
              isStaff || f.authorId === user?.id
                ? `${f.authorName}`
                : f.isAnonymous
                ? "Anonymous Student"
                : f.authorName;

            const canDelete = isStaff || (user && user.id === f.creatorId);

            return (
              <li
                key={f.id}
                className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm hover:border-stone-300 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/faqs/${f.id}`} className="group flex-1">
                    <h2 className="font-semibold text-base text-stone-900">
                      {f.question}
                    </h2>
                  </Link>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[f.status]}`}
                  >
                    {f.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-stone-400 mt-1">
                  <span>
                    {t("faqs.askedBy", { author: displayName, date: formatDisplayDate(f.createdAt) })}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {f.tags?.map((tag) => (
                    <span
                      key={tag.id}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorForTag(tag)}`}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100 text-xs">
                  <Link href={`/faqs/${f.id}`} className="text-sm text-teal-700 hover:text-teal-900 font-medium">
                    {isStaff ? t("faqs.actions.answer") : "View Discussion"}
                  </Link>
                  <div className="flex items-center gap-3">
                    {isStaff && (
                      <button
                        type="button"
                        onClick={() => handleToggleResolve(f)}
                        className={`text-sm font-medium ${
                          f.status === "RESOLVED"
                            ? "text-stone-500 hover:text-stone-700"
                            : "text-emerald-700 hover:text-emerald-900"
                        }`}
                      >
                        {f.status === "RESOLVED"
                          ? t("faqs.actions.reopenquestion")
                          : t("faqs.actions.markAsResolved")}
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setConfirming({ id: f.id, type: "delete" })}
                        disabled={deletingId === f.id}
                        className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 font-medium transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deletingId === f.id ? t("common.loading") : t("faqs.actions.delete")}
                      </button>
                    )}
                  </div>
                </div>

                {confirming?.id === f.id && confirming.type === "delete" && (
                  <div className="mt-3 pt-3 border-t border-stone-100 bg-red-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg flex flex-col items-end">
                    <p className="text-xs text-red-700 font-medium mb-2 text-right">
                      {t("announcements.confirm.deleteList")}
                    </p>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(f.id)}
                        disabled={deletingId === f.id}
                        className="text-xs font-medium bg-red-700 text-white rounded px-3 py-1.5 hover:bg-red-800 transition-colors disabled:opacity-50"
                      >
                        {deletingId === f.id ? t("common.loading") : t("announcements.confirm.yesDelete")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        disabled={deletingId === f.id}
                        className="text-xs font-medium border border-stone-300 bg-white rounded px-3 py-1.5 hover:bg-stone-50 transition-colors disabled:opacity-50"
                      >
                        {t("common.cancel")}
                      </button>
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