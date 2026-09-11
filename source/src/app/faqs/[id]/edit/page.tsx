"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FAQForm, { FaqFormValues } from "@/src/components/faq-form";
import Toast from "@/src/components/toast";
import { Faq, fetchFaqById, updateFaq } from "@/src/lib/faqs";
import { fetchTags, Tag } from "@/src/lib/tags";
import { useRole } from "@/src/components/role-context";

type Props = {
  params: Promise<{ id: string }>;
};

export default function EditFAQPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isStaff, loading: roleLoading } = useRole();
  const [faq, setFAQ] = useState<Faq | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDraftToast, setShowDraftToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isStaff) {
      router.replace("/faqs");
    }
  }, [roleLoading, isStaff, router]);

  useEffect(() => {
    Promise.all([fetchFaqById(id), fetchTags()])
      .then(([f, t]) => {
        setFAQ(f);
        setTags(t);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (values: FaqFormValues, status: "draft" | "published"): Promise<void> => {
    if (!user) return;
    setError(null);
    try {
      await updateFaq(id, values, status, user.id);
    } catch {
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

  if (roleLoading || !isStaff) return null;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-sm text-stone-500">Loading…</p>
      </div>
    );
  }

  if (!faq) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-sm text-stone-500">FAQ not found.</p>
      </div>
    );
  }

  const initialValues: FaqFormValues = {
    question: faq.question,
    answer: faq.answer,
    tagIds: faq.tags.map((tag) => tag.id),
    imageFile: null,
    removeImage: false,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Edit FAQ</h1>
      <p className="text-sm text-stone-500 mb-6">Update the details below and save your changes.</p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <FAQForm
        tags={tags}
        initialValues={initialValues}
        initialImageUrl={faq.imageUrl}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/faqs")}
      />

      {showDraftToast && <Toast message="Saved to Drafts" onDismiss={() => setShowDraftToast(false)} />}
    </div>
  );
}