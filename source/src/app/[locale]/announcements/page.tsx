"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import FilterableLayout from "@/src/components/filterable-layout";
import {
  Announcement,
  AnnouncementStatus,
  fetchAnnouncements,
  formatDisplayDate,
  setAnnouncementActive,
  setAnnouncementArchived,
  deleteAnnouncement,
  subscribeToAnnouncements,
  summarize,
} from "@/src/lib/announcements";
import { colorForTag } from "@/src/lib/tags";
import { useRole } from "@/src/components/role-context";

const STATUS_BADGE: Record<AnnouncementStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  DRAFT: "bg-stone-200 text-stone-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

const STATUS_LABEL_KEY: Record<AnnouncementStatus, string> = {
  ACTIVE: "announcements.status.published",
  DRAFT: "announcements.status.draft",
  ARCHIVED: "announcements.status.archived",
};

export default function AnnouncementsPage() {
  const t = useTranslations();
  const { user, isStaff } = useRole();

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"all" | "mine">("all");
  // confirming: which item's confirmation box is open, and for which action
  const [confirming, setConfirming] = useState<{ id: string; type: "archive" | "delete" } | null>(null);
  const [publishErrors, setPublishErrors] = useState<Record<string, string>>({});

  const loadItems = (): void => {
    fetchAnnouncements()
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Live-refresh the list when any announcement or tag link changes —
  // debounced since a single edit fires several table events at once
  // (an announcement update plus tag inserts/deletes).
  useEffect(() => {
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

  const visibleItems =
    isStaff && scope === "mine"
      ? items.filter((a) => a.creatorId === user?.id)
      : isStaff
        ? items.filter((a) => a.status !== "DRAFT")
        : items.filter((a) => a.status === "ACTIVE");

  const handleArchive = async (a: Announcement): Promise<void> => {
    await setAnnouncementArchived(a.id, a.startsAt);
    setConfirming(null);
    loadItems();
  };

  const handleDeletePermanently = async (id: string): Promise<void> => {
    await deleteAnnouncement(id);
    setConfirming(null);
    loadItems();
  };

  // Shared by "quick publish" (draft → published) and "restore" (archived → published).
  // SRS-9 still applies in both directions: at least one tag is required.
  const handlePublish = async (item: Announcement): Promise<void> => {
    if (item.tags.length === 0) {
      setPublishErrors((prev) => ({ ...prev, [item.id]: t("validation.selectTagBeforePublish") }));
      return;
    }
    setPublishErrors((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    await setAnnouncementActive(item.id);
    loadItems();
  };

  const handleApplyFilter = (selectedTags: string[]): void => {
    console.log("Applying filter:", selectedTags);
  };

  return (
    <FilterableLayout onApplyFilter={handleApplyFilter}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t("common.latestNews")}</h1>

        {isStaff && (
          <div className="flex rounded-md border border-stone-300 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setScope("all")}
              className={`px-3 py-1.5 transition-colors ${
                scope === "all" ? "bg-teal-600 text-white" : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              {t("announcements.scope.all")}
            </button>
            <button
              type="button"
              onClick={() => setScope("mine")}
              className={`px-3 py-1.5 transition-colors ${
                scope === "mine" ? "bg-teal-600 text-white" : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              {t("announcements.scope.mine")}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-stone-500">{t("common.loading")}</p>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-500 text-sm">
          {scope === "mine" ? t("announcements.empty.mine") : t("announcements.empty.all")}
        </div>
      ) : (
        <ul className="space-y-4">
          {visibleItems.map((a) => (
            <li key={a.id} className="rounded-lg border border-stone-200 bg-white p-4 flex flex-col">
              <Link href={`/announcements/${a.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-base leading-snug">{a.title}</h2>
                  {isStaff && (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[a.status]}`}>
                      {t(STATUS_LABEL_KEY[a.status])}
                    </span>
                  )}
                </div>
                <span className="text-xs text-stone-400 mt-1 block">
                  {t("announcements.postedOn", { date: formatDisplayDate(a.startsAt), author: a.authorName })}
                </span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {a.tags.map((tag) => (
                    <span key={tag.id} className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorForTag(tag)}`}>
                      {tag.name}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-stone-600 mt-2 leading-relaxed">{summarize(a.body)}</p>
              </Link>

              {isStaff && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-stone-100 flex-wrap">
                  {a.status === "DRAFT" && (
                    <button
                      type="button"
                      onClick={() => handlePublish(a)}
                      className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
                    >
                      {t("announcements.actions.publish")}
                    </button>
                  )}
                  {a.status === "ARCHIVED" && (
                    <button
                      type="button"
                      onClick={() => handlePublish(a)}
                      className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
                    >
                      {t("announcements.actions.restore")}
                    </button>
                  )}
                  <Link
                    href={`/announcements/${a.id}/edit`}
                    className="text-sm text-teal-700 hover:text-teal-900 font-medium"
                  >
                    {t("announcements.actions.edit")}
                  </Link>
                  {a.status !== "ARCHIVED" ? (
                    <button
                      type="button"
                      onClick={() => setConfirming({ id: a.id, type: "archive" })}
                      className="text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      {t("announcements.actions.archive")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming({ id: a.id, type: "delete" })}
                      className="text-sm text-red-700 hover:text-red-900 font-medium"
                    >
                      {t("announcements.actions.deletePermanently")}
                    </button>
                  )}
                </div>
              )}

              {publishErrors[a.id] && (
                <div className="mt-2 pt-2 border-t border-stone-100">
                  <p className="text-xs text-red-600">
                    {publishErrors[a.id]}{" "}
                    <Link href={`/announcements/${a.id}/edit`} className="underline hover:text-red-800">
                      {t("announcements.actions.editToAddTags")}
                    </Link>
                  </p>
                </div>
              )}

              {confirming?.id === a.id && confirming.type === "archive" && (
                <div className="mt-2 pt-2 border-t border-stone-100">
                  <p className="text-xs text-stone-600 mb-2">
                    {t("announcements.confirm.archiveList")}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleArchive(a)}
                      className="text-xs font-medium bg-red-600 text-white rounded px-3 py-1.5 hover:bg-red-700 transition-colors"
                    >
                      {t("announcements.confirm.yesArchive")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="text-xs font-medium border border-stone-300 rounded px-3 py-1.5 hover:bg-stone-50 transition-colors"
                    >
                      {t("common.cancel")}
                    </button>
                  </div>
                </div>
              )}

              {confirming?.id === a.id && confirming.type === "delete" && (
                <div className="mt-2 pt-2 border-t border-stone-100 bg-red-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
                  <p className="text-xs text-red-700 font-medium mb-2">
                    {t("announcements.confirm.deleteList")}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleDeletePermanently(a.id)}
                      className="text-xs font-medium bg-red-700 text-white rounded px-3 py-1.5 hover:bg-red-800 transition-colors"
                    >
                      {t("announcements.confirm.yesDelete")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(null)}
                      className="text-xs font-medium border border-stone-300 rounded px-3 py-1.5 hover:bg-white transition-colors"
                    >
                      {t("common.cancel")}
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
