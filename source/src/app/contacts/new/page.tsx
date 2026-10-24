"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ContactForm, { ContactFormValues } from "@/src/components/contact-form";
import Toast from "@/src/components/toast";
import { insertContact } from "@/src/lib/contacts";
import { fetchTags, Tag } from "@/src/lib/tags";
import { useRole } from "@/src/components/role-context";

export default function NewContactPage() {
  const router = useRouter();
  const { user, isStaff, loading } = useRole();
  const [tags, setTags] = useState<Tag[]>([]);
  const [showDraftToast, setShowDraftToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !isStaff) {
      router.replace("/contacts");
    }
  }, [loading, isStaff, router]);

  useEffect(() => {
    fetchTags().then(setTags).catch(() => setTags([]));
  }, []);

  const handleSubmit = async (values: ContactFormValues, status: "draft" | "published"): Promise<void> => {
    if (!user) return;
    setError(null);
    try {
      await insertContact(values, status, user.id);
    } catch (err) {
      console.error("[insertContact debug]", err);
      setError("Something went wrong while saving. Please try again.");
      return;
    }

    if (status === "draft") {
      // Show a brief confirmation before navigating away so the save action feels acknowledged
      setShowDraftToast(true);
      setTimeout(() => router.push("/contacts"), 900);
    } else {
      router.push("/contacts");
    }
  };

  if (loading || !isStaff) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">New Contact</h1>
      <p className="text-sm text-stone-500 mb-6">
        Fill in the contact details below. You can save as a draft or publish immediately.
      </p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <ContactForm tags={tags} onSubmit={handleSubmit} onCancel={() => router.push("/contacts")} />

      {showDraftToast && <Toast message="Saved to Drafts" onDismiss={() => setShowDraftToast(false)} />}
    </div>
  );
}