"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AnnouncementForm, { AnnouncementFormValues } from "@/src/components/announcement-form";
import Toast from "@/src/components/toast";
import { insertAnnouncement } from "@/src/lib/announcements";
import { fetchTags, Tag } from "@/src/lib/tags";
import { useRole } from "@/src/components/role-context";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const { user, isStaff, loading } = useRole();
  const [tags, setTags] = useState<Tag[]>([]);
  const [showDraftToast, setShowDraftToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isStaff) {
      router.replace("/announcements");
    }
  }, [loading, isStaff, router]);

  useEffect(() => {
    fetchTags().then(setTags).catch(() => setTags([]));
  }, []);

  const handleSubmit = async (values: AnnouncementFormValues, status: "draft" | "published"): Promise<void> => {
    if (!user) return;
    setError(null);
    try {
      await insertAnnouncement(values, status, user.id);
    } catch (err) {
      console.error("[insertAnnouncement debug]", err);
      setError("Something went wrong while saving. Please try again.");
      return;
    }

    if (status === "draft") {
      // Show a brief confirmation before navigating away, so the save
      // action feels acknowledged rather than a silent redirect.
      setShowDraftToast(true);
      setTimeout(() => router.push("/announcements"), 900);
    } else {
      router.push("/announcements");
    }
  };

  if (loading || !isStaff) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">New Announcement</h1>
      <p className="text-sm text-stone-500 mb-6">
        Fill in the details below. You can save as a draft, or publish immediately once at least one tag is selected.
      </p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <AnnouncementForm tags={tags} onSubmit={handleSubmit} onCancel={() => router.push("/announcements")} />

      {showDraftToast && <Toast message="Saved to Drafts" onDismiss={() => setShowDraftToast(false)} />}
    </div>
  );
}
