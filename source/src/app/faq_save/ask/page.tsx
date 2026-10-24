"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { fetchTags, Tag } from "@/src/lib/tags";

export default function AskFaqPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tag Handlers
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tag.trim()) {
      e.preventDefault();
      if (!tags.includes(tag.trim())) {
        setTags([...tags, tag.trim()]);
      }
      setTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Combine title and description into the 'question' column expected by Supabase
      const fullQuestionText = description.trim()
        ? `${title.trim()}\n\n${description.trim()}`
        : title.trim();

      // 1. Insert into main faqs table using exact schema properties
      const { data: faqData, error: insertError } = await supabase
        .from("faqs")
        .insert({
          title: title.trim(),
          body: description.trim(),
          is_anonymous: true, // Default to true for students
          creator_id: user?.id ?? null,
          status: "UNANSWERED",
        } as any) // Use 'as any' temporarily until type definitions are re-generated
        .select("id")
        .single();

      if (insertError || !faqData) throw insertError;

      const faqId = faqData.id;

      // 2. Insert tags & junction entries
      if (tags.length > 0) {
        for (const tagName of tags) {
          const { data: tagData } = await supabase
            .from("tag")
            .upsert({ name: tagName }, { onConflict: "name" })
            .select("id")
            .single();

          if (tagData) {
            await supabase
              .from("faq_tag")
              .insert({ faq_id: faqId, tag_id: tagData.id });
          }
        }
      }

      // 3. Handle File Attachment upload if provided
      if (file) {
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

        const { data: attachmentData } = await supabase
          .from("attachment")
          .insert({
            filename: file.name,
            filesize: file.size,
            url: publicUrlData.publicUrl,
            creator_id: user?.id ?? null,
          })
          .select("id")
          .single();

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
        <h1 className="text-2xl font-bold text-gray-900">Ask a Question</h1>
        <p className="text-sm text-gray-600 mt-1">
          Post your question or inquiry here. Submissions are anonymous to students by default.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. How do I request an extension for Assignment 2?"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-700"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="description"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Provide additional details about your question..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-700"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
          <input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Type a tag and press Enter"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm mb-2"
          />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-medium"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-indigo-900"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Attachment */}
        <div>
          <label htmlFor="attachment" className="block text-sm font-medium text-gray-700 mb-1">
            Attachment <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="attachment"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Question"}
          </button>
        </div>
      </form>
    </div>
  );
}