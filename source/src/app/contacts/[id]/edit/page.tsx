"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ContactForm, { ContactFormValues } from "@/src/components/contact-form";
import Toast from "@/src/components/toast";
import { Contact, fetchContactById, updateContact } from "@/src/lib/contacts";
import { fetchTags, Tag } from "@/src/lib/tags";
import { useRole } from "@/src/components/role-context";

type Props = {
  params: Promise<{ id: string }>;
};

export default function EditContactPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isStaff, loading: roleLoading } = useRole();
  const [contact, setContact] = useState<Contact | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDraftToast, setShowDraftToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roleLoading && !isStaff) {
      router.replace("/contacts");
    }
  }, [roleLoading, isStaff, router]);

  useEffect(() => {
    Promise.all([fetchContactById(id), fetchTags()])
      .then(([c, t]) => {
        setContact(c);
        setTags(t);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (values: ContactFormValues, status: "draft" | "published"): Promise<void> => {
    if (!user) return;
    setError(null);
    try {
      await updateContact(id, values, status, user.id);
    } catch {
      setError("Something went wrong while saving. Please try again.");
      return;
    }

    if (status === "draft") {
      setShowDraftToast(true);
      setTimeout(() => router.push("/contacts"), 900);
    } else {
      router.push("/contacts");
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

  if (!contact) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-sm text-stone-500">Contact not found.</p>
      </div>
    );
  }

  const initialValues: ContactFormValues = {
    name: contact.name,
    roleType: contact.roleType,
    email: contact.email,
    building: contact.building || "",
    room: contact.room || "",
    otherContact: contact.otherContact || "",
    bio: contact.bio || "",
    tagIds: contact.tags.map((t) => t.id),
    imageFile: null,
    removeImage: false,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">Edit Contact</h1>
      <p className="text-sm text-stone-500 mb-6">Update contact details and save changes.</p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <ContactForm
        tags={tags}
        initialValues={initialValues}
        initialImageUrl={contact.imageUrl}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/contacts")}
      />

      {showDraftToast && <Toast message="Saved to Drafts" onDismiss={() => setShowDraftToast(false)} />}
    </div>
  );
}