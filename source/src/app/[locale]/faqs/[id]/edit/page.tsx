"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import FaqForm, { FaqFormValues } from "@/src/components/faq-form";
import Toast from "@/src/components/toast";
import { Faq, FaqStatus, fetchFaqById, updateFaq } from "@/src/lib/faqs";
import { fetchTags, Tag } from "@/src/lib/tags";
import { useRole } from "@/src/components/role-context";

type Props = {
  params: Promise<{ id: string }>;
};

export default function EditFaqPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: roleLoading } = useRole();
  const [faq, setFaq] = useState<Faq | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [editStatus, setEditStatus] = useState<FaqStatus>("UNANSWERED");
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations();

  const canEdit = Boolean(user && faq?.creatorId && faq.creatorId === user.id);

  useEffect(() => {
    Promise.all([fetchFaqById(id), fetchTags()])
      .then(([fetchedFaq, fetchedTags]) => {
        setFaq(fetchedFaq);
        setTags(fetchedTags);
        if (fetchedFaq) {
          setEditStatus(fetchedFaq.status);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!roleLoading && !loading && faq && !canEdit) {
      router.replace(`/faqs/${id}`);
    }
  }, [roleLoading, loading, faq, canEdit, router, id]);

  const handleSubmit = async (values: FaqFormValues, _status: "draft" | "published"): Promise<void> => {
    if (!user || !faq) return;
    setError(null);

    const trimmedQuestion = values.question.trim();
    const trimmedDescription = values.description.trim();

    try {
      await updateFaq(
        id,
        {
          question: trimmedQuestion,
          description: trimmedDescription,
          tagIds: values.tagIds,
          imageFile: values.imageFile,
          removeImage: values.removeImage,
        },
        user.id,
      );

    } catch {
      setError(t("validation.saveFailed"));
      return;
    }

    setShowSavedToast(true);
    setTimeout(() => router.push(`/faqs/${id}`), 900);
  };

  if (roleLoading || loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-sm text-stone-500">{t("common.loading")}</p>
      </div>
    );
  }

  if (!faq) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-sm text-stone-500">{t("faqs.notFound")}</p>
      </div>
    );
  }

  if (!canEdit) return null;

  const initialValues: FaqFormValues = {
    question: faq.question,
    description: faq.description || "",
    tagIds: faq.tags.map((tag) => tag.id),
    imageFile: null,
    removeImage: false,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">{t("faqs.editPage.heading")}</h1>
      <p className="text-sm text-stone-500 mb-6">{t("faqs.editPage.description")}</p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <FaqForm
        tags={tags}
        initialValues={initialValues}
        initialImageUrl={faq.imageUrl}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/faqs/${id}`)}
      />

      {showSavedToast && <Toast message="Saved changes" onDismiss={() => setShowSavedToast(false)} />}
    </div>
  );
}