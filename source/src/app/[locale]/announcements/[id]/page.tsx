"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import {
  Announcement,
  deleteAnnouncement,
  fetchAnnouncementById,
  formatDisplayDate,
  setAnnouncementActive,
  setAnnouncementArchived,
  subscribeToAnnouncement,
} from "@/src/lib/announcements";
import { useRole } from "@/src/components/role-context";
import { useDebouncedSubscription } from "@/src/lib/use-debounced-subscription";
import { TagBadges } from "@/src/components/tag-badges";
import { ConfirmButtons } from "@/src/components/confirm-buttons";
import {
  AnnouncementStaffActions,
  PublishTagError,
  type ConfirmAction,
} from "@/src/components/announcements/announcement-staff-actions";

type Props = {
  // In current Next.js, params is a Promise, not a plain object —
  // must be unwrapped with use() before reading .id
  params: Promise<{ id: string }>;
};

export default function AnnouncementDetailPage({ params }: Props) {
  const { id } = use(params);
  const t = useTranslations();
  const router = useRouter();
  const { isStaff } = useRole();

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  // confirming: which confirmation box is open, if any
  const [confirming, setConfirming] = useState<ConfirmAction | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnnouncementById(id)
      .then(setAnnouncement)
      .catch((err) => {
        console.error("Failed to load announcement:", err);
        setAnnouncement(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Live-refresh this announcement (and its tags) when it changes elsewhere —
  // e.g. another staff member archives or edits it while it's open here.
  useDebouncedSubscription(
    (onChange) => subscribeToAnnouncement(id, onChange),
    () => fetchAnnouncementById(id).then(setAnnouncement),
    id,
  );

  if (loading) {
    return <p className="text-sm text-stone-500">{t("common.loading")}</p>;
  }

  if (!announcement) {
    return <p className="text-sm text-stone-500">{t("announcements.notFound")}</p>;
  }

  // Every action that changes the status ends back on the list
  const runThenReturnToList = async (action: () => Promise<void>): Promise<void> => {
    await action();
    setConfirming(null);
    router.push("/announcements");
  };

  const handleArchive = () =>
    runThenReturnToList(() => setAnnouncementArchived(announcement.id, announcement.startsAt));

  const handleDeletePermanently = () => runThenReturnToList(() => deleteAnnouncement(announcement.id));

  // Shared by "Publish" (draft → published) and "Restore" (archived → published).
  // SRS-9 still applies either way: at least one tag is required.
  const handlePublish = async (): Promise<void> => {
    if (announcement.tags.length === 0) {
      setPublishError(t("validation.selectTagBeforePublish"));
      return;
    }
    setPublishError(null);
    await runThenReturnToList(() => setAnnouncementActive(announcement.id));
  };

  return (
    <article>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        {/* router.back() uses real browser history — if you arrived from Main,
            this returns to Main; if you arrived from the /announcements list,
            this returns to the list. No guessing needed. */}
        <button
          type="button"
          onClick={() => router.back()}
          className="flex min-w-0 items-center gap-2 text-left text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="min-w-0 font-medium text-stone-900 [overflow-wrap:anywhere]">{announcement.title}</span>
        </button>

        {isStaff && (
          <div className="flex items-center gap-3 flex-wrap">
            <AnnouncementStaffActions
              id={id}
              status={announcement.status}
              onPublish={handlePublish}
              onRequestConfirm={setConfirming}
            />
          </div>
        )}
      </div>

      {publishError && (
        <p className="text-xs text-red-600 mb-3">
          <PublishTagError id={id} message={publishError} />
        </p>
      )}

      {confirming === "archive" && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-stone-700">{t("announcements.confirm.archiveDetail")}</p>
          <ConfirmButtons
            confirmLabel={t("announcements.confirm.yesArchive")}
            cancelLabel={t("common.cancel")}
            onConfirm={handleArchive}
            onCancel={() => setConfirming(null)}
            className="flex gap-2 shrink-0"
          />
        </div>
      )}

      {confirming === "delete" && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3">
          <p className="text-xs text-red-700 font-medium mb-2">{t("announcements.confirm.deleteDetail")}</p>
          <ConfirmButtons
            confirmLabel={t("announcements.confirm.yesDelete")}
            cancelLabel={t("common.cancel")}
            onConfirm={handleDeletePermanently}
            onCancel={() => setConfirming(null)}
            tone="strong"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-2">
        <TagBadges tags={announcement.tags} departmentOnly={announcement.departmentOnly} />
      </div>

      <p className="text-xs text-stone-400 mb-4">
        {t("announcements.postedOn", { date: formatDisplayDate(announcement.startsAt), author: announcement.authorName })}
      </p>

      {announcement.imageUrl && (
        <div className="mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={announcement.imageUrl}
            alt=""
            className="mb-4 max-h-96 w-full rounded-lg border border-stone-200 object-cover"
          />
        </div>
      )}

      <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line mb-4">{announcement.body}</p>
    </article>
  );
}
