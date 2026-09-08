"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FilterableLayout from "@/src/components/filterable-layout";
import { ANNOUNCEMENTS } from "@/src/lib/announcements";
import { useRole } from "@/src/components/role-context";

type Props = {
  // In current Next.js, params is a Promise, not a plain object —
  // must be unwrapped with use() before reading .id
  params: Promise<{ id: string }>;
};

export default function AnnouncementDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { role } = useRole();
  const isStaff = role === "staff" || role === "admin";

  // confirming: which confirmation box is open, if any
  const [confirming, setConfirming] = useState<"archive" | "delete" | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const announcement = ANNOUNCEMENTS.find((a) => a.id === id);

  const handleApplyFilter = (selectedTags: string[]): void => {
    console.log("Applying filter:", selectedTags);
  };

  if (!announcement) {
    return (
      <FilterableLayout onApplyFilter={handleApplyFilter}>
        <p className="text-sm text-stone-500">Announcement not found.</p>
      </FilterableLayout>
    );
  }

  // TODO: replace all direct mutations below with real API calls once the
  // backend is connected. Replacing the entry in the shared mock array is a
  // temporary shortcut for demo purposes only — the object bound to
  // `announcement` above is never mutated in place, since it was produced
  // during render (React flags in-place mutation of it as a bug).
  const setStatus = (status: "draft" | "published" | "archived"): void => {
    const index = ANNOUNCEMENTS.findIndex((a) => a.id === id);
    if (index !== -1) ANNOUNCEMENTS[index] = { ...ANNOUNCEMENTS[index], status };
  };

  const handleArchive = (): void => {
    setStatus("archived");
    setConfirming(null);
    router.push("/announcements");
  };

  const handleDeletePermanently = (): void => {
    const index = ANNOUNCEMENTS.findIndex((a) => a.id === id);
    if (index !== -1) ANNOUNCEMENTS.splice(index, 1);
    setConfirming(null);
    router.push("/announcements");
  };

  // Shared by "Publish" (draft → published) and "Restore" (archived → published).
  // SRS-9 still applies either way: at least one tag is required.
  const handlePublish = (): void => {
    if (announcement.tags.length === 0) {
      setPublishError("Select at least one tag before publishing.");
      return;
    }
    setPublishError(null);
    setStatus("published");
    router.push("/announcements");
  };

  return (
    <FilterableLayout onApplyFilter={handleApplyFilter}>
      <article>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          {/* router.back() uses real browser history — if you arrived from Main,
              this returns to Main; if you arrived from the /announcements list,
              this returns to the list. No guessing needed. */}
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium text-stone-900">{announcement.title}</span>
          </button>

          {isStaff && (
            <div className="flex items-center gap-3 flex-wrap">
              {announcement.status === "draft" && (
                <button
                  type="button"
                  onClick={handlePublish}
                  className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
                >
                  Publish
                </button>
              )}
              {announcement.status === "archived" && (
                <button
                  type="button"
                  onClick={handlePublish}
                  className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
                >
                  Restore to Published
                </button>
              )}
              <Link
                href={`/announcements/${id}/edit`}
                className="text-sm text-teal-700 hover:text-teal-900 font-medium"
              >
                Edit
              </Link>
              {announcement.status !== "archived" ? (
                <button
                  type="button"
                  onClick={() => setConfirming("archive")}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Archive
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming("delete")}
                  className="text-sm text-red-700 hover:text-red-900 font-medium"
                >
                  Delete Permanently
                </button>
              )}
            </div>
          )}
        </div>

        {publishError && (
          <p className="text-xs text-red-600 mb-3">
            {publishError}{" "}
            <Link href={`/announcements/${id}/edit`} className="underline hover:text-red-800">
              Edit to add tags
            </Link>
          </p>
        )}

        {confirming === "archive" && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-stone-700">
              Archive this announcement? It will be hidden from students but kept for staff reference.
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={handleArchive}
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

        {confirming === "delete" && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3">
            <p className="text-xs text-red-700 font-medium mb-2">
              Permanently delete this announcement? This cannot be undone — it will be removed completely, not just hidden.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDeletePermanently}
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

        <div className="flex flex-wrap gap-1.5 mb-2">
          {announcement.tags.map((tag) => (
            <span key={tag.label} className={`text-xs font-medium px-2 py-0.5 rounded-full ${tag.color}`}>
              {tag.label}
            </span>
          ))}
        </div>

        <p className="text-xs text-stone-400 mb-4">
          Posted on {announcement.publishedDate} by {announcement.author}
        </p>

        <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line mb-4">{announcement.body}</p>

        {announcement.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={announcement.imageUrl}
            alt=""
            className="w-full rounded-lg border border-stone-200"
          />
        )}
      </article>
    </FilterableLayout>
  );
}
