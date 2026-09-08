"use client";

import { useRouter } from "next/navigation";
import AnnouncementForm, { AnnouncementFormValues } from "@/src/components/announcement-form";

export default function NewAnnouncementPage() {
  const router = useRouter();

  const handleSubmit = (values: AnnouncementFormValues, status: "draft" | "published"): void => {
    // TODO: replace with a real API call once the backend is connected, e.g.
    // await fetch("/api/content/announcement", { method: "POST", body: JSON.stringify({ ...values, status }) });
    console.log("Saving announcement:", { ...values, status });
    router.push("/announcements");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">New Announcement</h1>
      <p className="text-sm text-stone-500 mb-6">
        Fill in the details below. You can save as a draft, or publish immediately once at least one tag is selected.
      </p>
      <AnnouncementForm onSubmit={handleSubmit} />
    </div>
  );
}
