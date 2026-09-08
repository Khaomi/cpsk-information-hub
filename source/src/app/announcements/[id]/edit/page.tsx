"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import AnnouncementForm, { AnnouncementFormValues } from "@/src/components/announcement-form";
import { ANNOUNCEMENTS } from "@/src/lib/announcements";

type Props = {
  params: Promise<{ id: string }>;
};

export default function EditAnnouncementPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const announcement = ANNOUNCEMENTS.find((a) => a.id === id);

  const handleSubmit = (values: AnnouncementFormValues, status: "draft" | "published"): void => {
    // TODO: replace with a real API call once the backend is connected
    console.log("Updating announcement:", id, { ...values, status });
    router.push("/announcements");
  };

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
    publishedDate: announcement.publishedDate,
    expiryDate: "",
    tagIds: [], // TODO: map announcement.tags back to tag IDs once tag IDs are stored, not just display labels
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Edit Announcement</h1>
      <p className="text-sm text-stone-500 mb-6">Update the details below and save your changes.</p>
      <AnnouncementForm initialValues={initialValues} onSubmit={handleSubmit} />
    </div>
  );
}
