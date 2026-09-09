"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AnnouncementForm, { AnnouncementFormValues } from "@/src/components/announcement-form";
import Toast from "@/src/components/toast";
import { Announcement, fetchAnnouncementById, toDateTimeInputValue, updateAnnouncement } from "@/src/lib/announcements";
import { fetchTags, Tag } from "@/src/lib/tags";
import { useRole } from "@/src/components/role-context";

type Props = {
  params: Promise<{ id: string }>;
};

export default function EditAnnouncementPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isStaff, loading: roleLoading } = useRole();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDraftToast, setShowDraftToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isStaff) {
      router.replace("/announcements");
    }
  }, [roleLoading, isStaff, router]);

  useEffect(() => {
    Promise.all([fetchAnnouncementById(id), fetchTags()])
      .then(([a, t]) => {
        setAnnouncement(a);
        setTags(t);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (values: AnnouncementFormValues, status: "draft" | "published"): Promise<void> => {
    if (!user) return;
    setError(null);
    try {
      await updateAnnouncement(id, values, status, user.id);
    } catch {
      setError("Something went wrong while saving. Please try again.");
      return;
    }

    if (status === "draft") {
      setShowDraftToast(true);
      setTimeout(() => router.push("/announcements"), 900);
    } else {
      router.push("/announcements");
    }
  };

  if (roleLoading || !isStaff) return null;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-sm text-stone-500">Loading…</p>
      </div>
    );
  }

  if (!announcement) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-sm text-stone-500">Announcement not found.</p>
      </div>
    );
  }

  const initialValues: AnnouncementFormValues = {
    title: announcement.title,
    body: announcement.body,
    publishedDate: toDateTimeInputValue(announcement.startsAt ?? announcement.draftStartsAt),
    expiryDate: toDateTimeInputValue(announcement.endsAt ?? announcement.draftEndsAt),
    tagIds: announcement.tags.map((t) => t.id),
    imageFile: null,
    removeImage: false,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Edit Announcement</h1>
      <p className="text-sm text-stone-500 mb-6">Update the details below and save your changes.</p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <AnnouncementForm
        tags={tags}
        initialValues={initialValues}
        initialImageUrl={announcement.imageUrl}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/announcements")}
      />

      {showDraftToast && <Toast message="Saved to Drafts" onDismiss={() => setShowDraftToast(false)} />}
    </div>
  );
}
