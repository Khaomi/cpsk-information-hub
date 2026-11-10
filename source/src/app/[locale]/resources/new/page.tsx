"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ResourceLinkForm, { ResourceLinkFormValues } from "@/src/components/resource-link-form";
import Toast from "@/src/components/toast";
import { insertResourceLink } from "@/src/lib/resourceLinks";
import { fetchTags, Tag } from "@/src/lib/tags";
import { useRole } from "@/src/components/role-context";

export default function NewResourceLinkPage() {
  const router = useRouter();
  const { user, isStaff, loading } = useRole();
  const [tags, setTags] = useState<Tag[]>([]);
  const [showDraftToast, setShowDraftToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isStaff) {
      router.replace("/resources");
    }
  }, [loading, isStaff, router]);

  useEffect(() => {
    fetchTags().then(setTags).catch(() => setTags([]));
  }, []);

  const handleSubmit = async (values: ResourceLinkFormValues, status: "draft" | "published"): Promise<void> => {
    if (!user) return;
    setError(null);
    try {
      await insertResourceLink(values, status, user.id);
    } catch (err) {
      console.error("[insertResourceLink debug]", err);
      setError("Something went wrong while saving. Please try again.");
      return;
    }

    if (status === "draft") {
      // Show a brief confirmation before navigating away
      setShowDraftToast(true);
      setTimeout(() => router.push("/resources"), 900);
    } else {
      router.push("/resources");
    }
  };

  if (loading || !isStaff) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">New Resource Link</h1>
      <p className="text-sm text-stone-500 mb-6">
        Fill in the details below. You can save as a draft, or publish immediately once at least one tag is selected.
      </p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <ResourceLinkForm tags={tags} onSubmit={handleSubmit} onCancel={() => router.push("/resources")} />

      {showDraftToast && <Toast message="Saved to Drafts" onDismiss={() => setShowDraftToast(false)} />}
    </div>
  );
}