"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FaqForm, { FaqFormValues } from "@/src/components/faq-form";
import Toast from "@/src/components/toast";
import { insertFaq } from "@/src/lib/faqs";
import { fetchTags, Tag } from "@/src/lib/tags";
import { useRole } from "@/src/components/role-context";

export default function NewFaqPage() {
  const router = useRouter();
  const { user, isStaff, loading } = useRole();
  const [tags, setTags] = useState<Tag[]>([]);
  const [showDraftToast, setShowDraftToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isStaff) {
      router.replace("/faqs");
    }
  }, [loading, isStaff, router]);

  useEffect(() => {
    fetchTags().then(setTags).catch(() => setTags([]));
  }, []);

  const handleSubmit = async (
    values: FaqFormValues,
    status: "draft" | "published"
  ): Promise<void> => {
    if (!user) return;
    setError(null);
    try {
      await insertFaq(values, status, user.id);
    } catch (err) {
      console.error("[insertFaq debug]", err);
      setError("Something went wrong while saving. Please try again.");
      return;
    }

    if (status === "draft") {
      setShowDraftToast(true);
      setTimeout(() => router.push("/faqs"), 900);
    } else {
      router.push("/faqs");
    }
  };

  if (loading || !isStaff) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">New FAQ</h1>
      <p className="text-sm text-stone-500 mb-6">
        Fill in the details below. You can save as a draft, or publish immediately once at least one tag is selected.
      </p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <FaqForm
        tags={tags}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/faqs")}
      />

      {showDraftToast && (
        <Toast
          message="Saved to Drafts"
          onDismiss={() => setShowDraftToast(false)}
        />
      )}
    </div>
  );
}