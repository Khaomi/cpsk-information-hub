"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { type Announcement, type AnnouncementStatus, formatDisplayDate, summarize } from "@/src/lib/announcements";
import { TagBadges } from "@/src/components/tag-badges";
import { ConfirmButtons } from "@/src/components/confirm-buttons";
import {
  AnnouncementStaffActions,
  PublishTagError,
  type ConfirmAction,
} from "@/src/components/announcements/announcement-staff-actions";

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

type AnnouncementCardProps = {
  announcement: Announcement;
  isStaff: boolean;
  publishError?: string;
  confirming: ConfirmAction | null; // which confirmation box is open on this card
  onPublish: () => void;
  onRequestConfirm: (action: ConfirmAction) => void;
  onCancelConfirm: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

// One announcement in the list: summary linking to the detail page, plus the
// staff controls and their inline confirmation boxes.
export default function AnnouncementCard({
  announcement: a,
  isStaff,
  publishError,
  confirming,
  onPublish,
  onRequestConfirm,
  onCancelConfirm,
  onArchive,
  onDelete,
}: AnnouncementCardProps) {
  const t = useTranslations();

  return (
    <li className="rounded-lg border border-stone-200 bg-white p-4 flex flex-col">
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
          <TagBadges tags={a.tags} departmentOnly={a.departmentOnly} />
        </div>
        <p className="text-sm text-stone-600 mt-2 leading-relaxed">{summarize(a.body)}</p>
      </Link>

      {isStaff && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-stone-100 flex-wrap">
          <AnnouncementStaffActions
            id={a.id}
            status={a.status}
            onPublish={onPublish}
            onRequestConfirm={onRequestConfirm}
          />
        </div>
      )}

      {publishError && (
        <div className="mt-2 pt-2 border-t border-stone-100">
          <p className="text-xs text-red-600">
            <PublishTagError id={a.id} message={publishError} />
          </p>
        </div>
      )}

      {confirming === "archive" && (
        <div className="mt-2 pt-2 border-t border-stone-100">
          <p className="text-xs text-stone-600 mb-2">{t("announcements.confirm.archiveList")}</p>
          <ConfirmButtons
            confirmLabel={t("announcements.confirm.yesArchive")}
            cancelLabel={t("common.cancel")}
            onConfirm={onArchive}
            onCancel={onCancelConfirm}
          />
        </div>
      )}

      {confirming === "delete" && (
        <div className="mt-2 pt-2 border-t border-stone-100 bg-red-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
          <p className="text-xs text-red-700 font-medium mb-2">{t("announcements.confirm.deleteList")}</p>
          <ConfirmButtons
            confirmLabel={t("announcements.confirm.yesDelete")}
            cancelLabel={t("common.cancel")}
            onConfirm={onDelete}
            onCancel={onCancelConfirm}
            tone="strong"
          />
        </div>
      )}
    </li>
  );
}
