"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ResourceLinkForm, { ResourceLinkFormValues } from "@/src/components/resource-link-form";
import Toast from "@/src/components/toast";
import { ResourceLink, fetchResourceLinkById, toDateTimeInputValue, updateResourceLink } from "@/src/lib/resourceLinks";
import { fetchTags, Tag } from "@/src/lib/tags";
import { useRole } from "@/src/components/role-context";

type Props = {
  params: Promise<{ id: string }>;
};

export default function EditResourceLinkPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isStaff, loading: roleLoading } = useRole();
  const [resourceLink, setResourceLink] = useState<ResourceLink | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDraftToast, setShowDraftToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isStaff) {
      router.replace("/resources");
    }
  }, [roleLoading, isStaff, router]);

  useEffect(() => {
    Promise.all([fetchResourceLinkById(id), fetchTags()])
      .then(([rl, t]) => {
        setResourceLink(rl);
        setTags(t);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (values: ResourceLinkFormValues, status: "draft" | "published"): Promise<void> => {
    if (!user) return;
    setError(null);
    try {
      await updateResourceLink(id, values, status);
    } catch {
      setError("Something went wrong while saving. Please try again.");
      return;
    }

    if (status === "draft") {
      setShowDraftToast(true);
      setTimeout(() => router.push("/resources"), 900);
    } else {
      router.push("/resources");
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

  if (!resourceLink) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-sm text-stone-500">Resource link not found.</p>
      </div>
    );
  }

  const initialValues: ResourceLinkFormValues = {
    title: resourceLink.title,
    url: resourceLink.url,
    publishedDate: toDateTimeInputValue(resourceLink.startsAt ?? resourceLink.draftStartsAt),
    expiryDate: toDateTimeInputValue(resourceLink.endsAt ?? resourceLink.draftEndsAt),
    tagIds: resourceLink.tags.map((t) => t.id),
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Edit Resource Link</h1>
      <p className="text-sm text-stone-500 mb-6">Update the details below and save your changes.</p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <ResourceLinkForm
        tags={tags}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/resources")}
      />

      {showDraftToast && <Toast message="Saved to Drafts" onDismiss={() => setShowDraftToast(false)} />}
    </div>
  );
}