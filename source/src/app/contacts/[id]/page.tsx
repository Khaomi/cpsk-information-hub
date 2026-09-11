"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FilterableLayout from "@/src/components/filterable-layout";
import {
  Contact,
  deleteContact,
  fetchContactById,
  setContactActive,
  setContactArchived,
  subscribeToContact,
} from "@/src/lib/contacts";
import { colorForTag } from "@/src/lib/tags";
import { useRole } from "@/src/components/role-context";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ContactDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { isStaff } = useRole();

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<"archive" | "delete" | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  useEffect(() => {
    fetchContactById(id)
      .then(setContact)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const scheduleReload = (): void => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => fetchContactById(id).then(setContact), 300);
    };

    const unsubscribe = subscribeToContact(id, scheduleReload);
    return () => {
      if (timeout) clearTimeout(timeout);
      unsubscribe();
    };
  }, [id]);

  const handleApplyFilter = (selectedTags: string[]): void => {
    console.log("Applying filter:", selectedTags);
  };

  if (loading) {
    return (
      <FilterableLayout onApplyFilter={handleApplyFilter}>
        <p className="text-sm text-stone-500">Loading…</p>
      </FilterableLayout>
    );
  }

  if (!contact) {
    return (
      <FilterableLayout onApplyFilter={handleApplyFilter}>
        <p className="text-sm text-stone-500">Contact not found.</p>
      </FilterableLayout>
    );
  }

  const handleArchive = async (): Promise<void> => {
    await setContactArchived(contact.id);
    setConfirming(null);
    router.push("/contacts");
  };

  const handleDeletePermanently = async (): Promise<void> => {
    await deleteContact(contact.id);
    setConfirming(null);
    router.push("/contacts");
  };

  const handlePublish = async (): Promise<void> => {
    if (contact.tags.length === 0) {
      setPublishError("Select at least one tag before publishing.");
      return;
    }
    setPublishError(null);
    await setContactActive(contact.id);
    router.push("/contacts");
  };

  return (
    <FilterableLayout onApplyFilter={handleApplyFilter}>
      <article className="bg-white border border-stone-200 rounded-lg p-6">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium text-stone-900">Back to Contacts</span>
          </button>

          {isStaff && (
            <div className="flex items-center gap-3 flex-wrap">
              {contact.status === "DRAFT" && (
                <button
                  type="button"
                  onClick={handlePublish}
                  className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
                >
                  Publish
                </button>
              )}
              {contact.status === "ARCHIVED" && (
                <button
                  type="button"
                  onClick={handlePublish}
                  className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
                >
                  Restore to Published
                </button>
              )}
              <Link href={`/contacts/${id}/edit`} className="text-sm text-teal-700 hover:text-teal-900 font-medium">
                Edit
              </Link>
              {contact.status !== "ARCHIVED" ? (
                <button
                  type="button"
                  onClick={() => setConfirming("archive")}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Archive
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming("delete")}
                  className="text-sm text-red-700 hover:text-red-900 font-medium"
                >
                  Delete Permanently
                </button>
              )}
            </div>
          )}
        </div>

        {publishError && (
          <p className="text-xs text-red-600 mb-3">
            {publishError}{" "}
            <Link href={`/contacts/${id}/edit`} className="underline hover:text-red-800">
              Edit to add tags
            </Link>
          </p>
        )}

        {confirming === "archive" && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-stone-700">
              Archive this contact? It will be hidden from students but kept for staff reference.
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={handleArchive}
                className="text-xs font-medium bg-red-600 text-white rounded px-3 py-1.5 hover:bg-red-700 transition-colors"
              >
                Yes, archive
              </button>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="text-xs font-medium border border-stone-300 rounded px-3 py-1.5 hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {confirming === "delete" && (
          <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3">
            <p className="text-xs text-red-700 font-medium mb-2">
              Permanently delete this contact? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDeletePermanently}
                className="text-xs font-medium bg-red-700 text-white rounded px-3 py-1.5 hover:bg-red-800 transition-colors"
              >
                Yes, delete permanently
              </button>
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="text-xs font-medium border border-stone-300 rounded px-3 py-1.5 hover:bg-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-6 items-start my-4">
          <div className="w-32 h-32 bg-stone-300 rounded-md overflow-hidden shrink-0">
            {contact.imageUrl ? (
              <img src={contact.imageUrl} alt={contact.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-stone-300" />
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-stone-900">{contact.name}</h1>
            <div className="flex flex-wrap gap-1.5 my-2">
              {contact.tags.map((tag) => (
                <span key={tag.id} className={`text-xs font-semibold px-2.5 py-1 rounded-md ${colorForTag(tag)}`}>
                  {tag.name}
                </span>
              ))}
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                  contact.roleType === "LECTURER" ? "bg-lime-300 text-lime-900" : "bg-orange-200 text-orange-900"
                }`}
              >
                {contact.roleType === "LECTURER" ? "Lecturer" : "TA"}
              </span>
            </div>

            <div className="text-sm text-stone-700 space-y-1.5 mt-4">
              <p>
                <span className="font-semibold">Email:</span> {contact.email || "—"}
              </p>
              {contact.roleType === "LECTURER" ? (
                <>
                  <p>
                    <span className="font-semibold">Building:</span> {contact.building || "—"}
                  </p>
                  <p>
                    <span className="font-semibold">Room:</span> {contact.room || "—"}
                  </p>
                </>
              ) : (
                <p>
                  <span className="font-semibold">Other way:</span> {contact.otherContact || "—"}
                </p>
              )}
            </div>
          </div>
        </div>

        {contact.bio && (
          <div className="mt-6 pt-4 border-t border-stone-200">
            <h3 className="font-semibold text-stone-800 mb-2">Biography / Additional Info</h3>
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{contact.bio}</p>
          </div>
        )}
      </article>
    </FilterableLayout>
  );
}