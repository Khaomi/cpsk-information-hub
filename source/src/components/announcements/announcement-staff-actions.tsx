"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import type { AnnouncementStatus } from "@/src/lib/announcements";

export type ConfirmAction = "archive" | "delete";

type AnnouncementStaffActionsProps = {
  id: string;
  status: AnnouncementStatus;
  onPublish: () => void;
  onRequestConfirm: (action: ConfirmAction) => void;
};

// Staff-only controls shared by the list card and the detail page. Renders no
// wrapper so each page keeps its own layout around the buttons.
//   DRAFT    -> Publish, Edit, Archive
//   ACTIVE   ->          Edit, Archive
//   ARCHIVED -> Restore, Edit, Delete permanently
export function AnnouncementStaffActions({ id, status, onPublish, onRequestConfirm }: AnnouncementStaffActionsProps) {
  const t = useTranslations();
  const isArchived = status === "ARCHIVED";

  return (
    <>
      {status !== "ACTIVE" && (
        <button type="button" onClick={onPublish} className="text-sm text-emerald-700 hover:text-emerald-900 font-medium">
          {t(isArchived ? "announcements.actions.restore" : "announcements.actions.publish")}
        </button>
      )}
      <Link href={`/announcements/${id}/edit`} className="text-sm text-teal-700 hover:text-teal-900 font-medium">
        {t("announcements.actions.edit")}
      </Link>
      {isArchived ? (
        <button
          type="button"
          onClick={() => onRequestConfirm("delete")}
          className="text-sm text-red-700 hover:text-red-900 font-medium"
        >
          {t("announcements.actions.deletePermanently")}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onRequestConfirm("archive")}
          className="text-sm text-red-600 hover:text-red-800 font-medium"
        >
          {t("announcements.actions.archive")}
        </button>
      )}
    </>
  );
}

// SRS-9: publishing needs at least one tag. Shows why it was refused, with a
// shortcut to the edit page to add one.
export function PublishTagError({ id, message }: { id: string; message: string }) {
  const t = useTranslations();
  return (
    <>
      {message}{" "}
      <Link href={`/announcements/${id}/edit`} className="underline hover:text-red-800">
        {t("announcements.actions.editToAddTags")}
      </Link>
    </>
  );
}
