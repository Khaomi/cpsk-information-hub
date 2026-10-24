"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { fetchTags, Tag } from "@/src/lib/tags";
import FaqForm, { FaqFormValues } from "@/src/components/faq-form";

export default function AskFaqPage() {
  const router = useRouter();
  const supabase = createClient();

  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch universal tags on mount
  useEffect(() => {
    fetchTags()
      .then((data) => setTags(data))
      .catch((err) => {
        console.error("Failed to load tags:", err);
      });
  }, []);

  const handleSubmit = async (values: FaqFormValues, status: "draft" | "published") => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 1. Insert into main faqs table with status set to UNANSWERED
      const { data: faqData, error: insertError } = await supabase
        .from("faqs")
        .insert({
          title: values.question.trim(),
          body: values.answer.trim() || null,
          is_anonymous: true,
          creator_id: user?.id ?? null,
          status: "UNANSWERED",
        } as any)
        .select("id")
        .single();

      if (insertError || !faqData) throw insertError;
      const faqId = faqData.id;

      // 2. Insert universal tag junction entries
      if (values.tagIds.length > 0) {
        const tagRows = values.tagIds.map((tagId) => ({
          faq_id: faqId,
          tag_id: tagId,
        }));
        const { error: tagError } = await supabase.from("faq_tag").insert(tagRows);
        if (tagError) throw tagError;
      }

      // 3. Handle File/Image Attachment upload if provided
      if (values.imageFile) {
        const file = values.imageFile;
        const fileExt = file.name.split(".").pop();
        const filePath = `faq-attachments/${Date.now()}_${Math.random()
          .toString(36)
          .substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("attachments")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from("attachments")
          .getPublicUrl(filePath);

        const { data: attachmentData, error: attError } = await supabase
          .from("attachment")
          .insert({
            filename: file.name,
            filesize: file.size,
            url: publicUrlData.publicUrl,
            creator_id: user?.id ?? null,
          })
          .select("id")
          .single();

        if (attError) throw attError;

        if (attachmentData) {
          await supabase
            .from("faq_attachment")
            .insert({ faq_id: faqId, attachment_id: attachmentData.id });
        }
      }

      router.push(`/faqs/${faqId}`);
    } catch (err: any) {
      console.error("Error creating question:", err);
      setError(err.message || "Failed to submit your question.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Ask a Question</h1>
        <p className="text-sm text-stone-600 mt-1">
          Post your question or inquiry here. Submissions are anonymous to students by default.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border border-stone-200 shadow-sm">
        <FaqForm
          tags={tags}
          onSubmit={handleSubmit}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}