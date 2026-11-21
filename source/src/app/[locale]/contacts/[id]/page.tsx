"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Contact,
  fetchContactById,
  subscribeToContact,
} from "@/src/lib/contacts";
import { colorForTag } from "@/src/lib/tags";
import { DepartmentOnlyBadge } from "@/src/components/department-only";

type Props = {
  params: Promise<{ id: string }>;
};

export default function ContactDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishError] = useState<string | null>(null);
  const t = useTranslations();

  useEffect(() => {
    fetchContactById(id)
      .then(setContact)
      .catch((err) => {
        console.error("Failed to load contact:", err);
        setContact(null);
      })
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
      <p className="text-sm text-stone-500">{t("common.loading")}</p>
    );
  }

  if (!contact) {
    return (
      <p className="text-sm text-stone-500">{t("contacts.notfound")}</p>
    );
  }

  return (
    <article className="bg-white border border-stone-200 rounded-lg p-6">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium text-stone-900">{t("contacts.back")}</span>
        </button>
      </div>

      {publishError && (
        <p className="text-xs text-red-600 mb-3">
          {publishError}{" "}
          <Link href={`/contacts/${id}/edit`} className="underline hover:text-red-800">
            {t("announcements.actions.editToAddTags")}
          </Link>
        </p>
      )}

      <div className="flex gap-6 items-start my-4">
        {/* Contact Photo / Avatar Box (matching list card size & shape) */}
        <div className="w-24 h-24 bg-stone-300 rounded-md overflow-hidden shrink-0">
          {contact.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={contact.imageUrl} alt={contact.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-stone-300" />
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold text-stone-900">{contact.name}</h1>
          
          {/* Tags matching the exact style used in the contacts list page */}
          <div className="flex flex-wrap gap-1.5 my-2">
            {contact.departmentOnly && <DepartmentOnlyBadge />}
            {contact.tags.map((tag) => (
              <span key={tag.id} className={`text-xs px-3 py-1 rounded-full font-medium ${colorForTag(tag)}`}>
                {tag.name}
              </span>
            ))}
          </div>

          <div className="text-xs text-stone-700 space-y-1.5 mt-3">
            <p>
              <span className="font-medium">{t("contacts.fields.email")}:</span> {contact.email || "—"}
            </p>
            {contact.roleType === "LECTURER" ? (
              <div className="flex gap-8">
                <p>
                  <span className="font-medium">{t("contacts.fields.building")}:</span> {contact.building || "—"}
                </p>
                <p>
                  <span className="font-medium">{t("contacts.fields.room")}:</span> {contact.room || "—"}
                </p>
              </div>
            ) : (
              <p>
                <span className="font-medium">{t("contacts.fields.otherWay")}:</span> {contact.otherContact || "—"}
              </p>
            )}
          </div>
        </div>
      </div>

      {contact.bio && (
        <div className="mt-6 pt-4 border-t border-stone-200">
          <h3 className="font-semibold text-stone-800 mb-2">{t("contacts.fields.bio")}</h3>
          <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line">{contact.bio}</p>
        </div>
      )}
    </article>
  );
}