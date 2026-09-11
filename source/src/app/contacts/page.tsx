"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import FilterableLayout from "@/src/components/filterable-layout";
import {
  Contact,
  ContactStatus,
  fetchContacts,
  setContactActive,
  setContactArchived,
  deleteContact,
  subscribeToContacts,
} from "@/src/lib/contacts";
import { colorForTag } from "@/src/lib/tags";
import { useRole } from "@/src/components/role-context";

const STATUS_BADGE: Record<ContactStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  DRAFT: "bg-stone-200 text-stone-700",
  ARCHIVED: "bg-red-100 text-red-700",
};

export default function ContactsPage() {
  const { user, isStaff } = useRole();

  const [items, setItems] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"all" | "mine">("all");
  const [confirming, setConfirming] = useState<{ id: string; type: "archive" | "delete" } | null>(null);
  const [publishErrors, setPublishErrors] = useState<Record<string, string>>({});

  const loadItems = (): void => {
    fetchContacts()
      .then(setItems)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const scheduleReload = (): void => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(loadItems, 300);
    };

    const unsubscribe = subscribeToContacts(scheduleReload);
    return () => {
      if (timeout) clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const visibleItems =
    isStaff && scope === "mine"
      ? items.filter((c) => c.creatorId === user?.id)
      : isStaff
        ? items.filter((c) => c.status !== "DRAFT")
        : items.filter((c) => c.status === "ACTIVE");

  const lecturers = visibleItems.filter((c) => c.roleType === "LECTURER");
  const tas = visibleItems.filter((c) => c.roleType === "TA");

  const handleArchive = async (contact: Contact): Promise<void> => {
    await setContactArchived(contact.id);
    setConfirming(null);
    loadItems();
  };

  const handleDeletePermanently = async (id: string): Promise<void> => {
    await deleteContact(id);
    setConfirming(null);
    loadItems();
  };

  const handlePublish = async (item: Contact): Promise<void> => {
    if (item.tags.length === 0) {
      setPublishErrors((prev) => ({ ...prev, [item.id]: "Select at least one tag before publishing." }));
      return;
    }
    setPublishErrors((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    await setContactActive(item.id);
    loadItems();
  };

  const handleApplyFilter = (selectedTags: string[]): void => {
    console.log("Applying filter:", selectedTags);
  };

  const renderContactCard = (c: Contact) => (
    <li key={c.id} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex gap-4">
        {/* Contact Photo / Avatar Box */}
        <div className="w-24 h-24 bg-stone-300 rounded-md shrink-0 overflow-hidden">
          {c.imageUrl ? (
            <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-stone-300" />
          )}
        </div>

        {/* Contact Info */}
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/contacts/${c.id}`} className="font-bold text-xl hover:underline">
              {c.name}
            </Link>
            {isStaff && (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[c.status]}`}>
                {c.status}
              </span>
            )}
          </div>

          {/* Tags / Badges */}
          <div className="flex flex-wrap gap-1.5 my-2">
            {c.tags.map((tag) => (
              <span key={tag.id} className={`text-xs font-semibold px-2.5 py-1 rounded-md ${colorForTag(tag)}`}>
                {tag.name}
              </span>
            ))}
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                c.roleType === "LECTURER" ? "bg-lime-300 text-lime-900" : "bg-orange-200 text-orange-900"
              }`}
            >
              {c.roleType === "LECTURER" ? "Lecturer" : "TA"}
            </span>
          </div>

          {/* Contact Details Grid */}
          <div className="text-xs text-stone-700 space-y-1 mt-3">
            <p>
              <span className="font-medium">Email:</span> {c.email || "—"}
            </p>
            {c.roleType === "LECTURER" ? (
              <div className="flex gap-8">
                <p>
                  <span className="font-medium">Building:</span> {c.building || "—"}
                </p>
                <p>
                  <span className="font-medium">Room:</span> {c.room || "—"}
                </p>
              </div>
            ) : (
              <p>
                <span className="font-medium">Other way:</span> {c.otherContact || "—"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Staff Actions */}
      {isStaff && (
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-stone-100 flex-wrap">
          {c.status === "DRAFT" && (
            <button
              type="button"
              onClick={() => handlePublish(c)}
              className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
            >
              Publish
            </button>
          )}
          {c.status === "ARCHIVED" && (
            <button
              type="button"
              onClick={() => handlePublish(c)}
              className="text-sm text-emerald-700 hover:text-emerald-900 font-medium"
            >
              Restore to Published
            </button>
          )}
          <Link href={`/contacts/${c.id}/edit`} className="text-sm text-teal-700 hover:text-teal-900 font-medium">
            Edit
          </Link>
          {c.status !== "ARCHIVED" ? (
            <button
              type="button"
              onClick={() => setConfirming({ id: c.id, type: "archive" })}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Archive
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming({ id: c.id, type: "delete" })}
              className="text-sm text-red-700 hover:text-red-900 font-medium"
            >
              Delete Permanently
            </button>
          )}
        </div>
      )}

      {publishErrors[c.id] && (
        <div className="mt-2 pt-2 border-t border-stone-100">
          <p className="text-xs text-red-600">
            {publishErrors[c.id]}{" "}
            <Link href={`/contacts/${c.id}/edit`} className="underline hover:text-red-800">
              Edit to add tags
            </Link>
          </p>
        </div>
      )}

      {confirming?.id === c.id && confirming.type === "archive" && (
        <div className="mt-2 pt-2 border-t border-stone-100">
          <p className="text-xs text-stone-600 mb-2">
            Archive this contact? It will be hidden from students but kept here for reference.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleArchive(c)}
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

      {confirming?.id === c.id && confirming.type === "delete" && (
        <div className="mt-2 pt-2 border-t border-stone-100 bg-red-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
          <p className="text-xs text-red-700 font-medium mb-2">
            Permanently delete this contact? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleDeletePermanently(c.id)}
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
    </li>
  );

  return (
    <FilterableLayout onApplyFilter={handleApplyFilter}>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-extrabold text-stone-900">Contacts Directory</h1>

        {isStaff && (
          <div className="flex rounded-md border border-stone-300 overflow-hidden text-sm">
            <button
              type="button"
              onClick={() => setScope("all")}
              className={`px-3 py-1.5 transition-colors ${
                scope === "all" ? "bg-teal-600 text-white" : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setScope("mine")}
              className={`px-3 py-1.5 transition-colors ${
                scope === "mine" ? "bg-teal-600 text-white" : "bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              My Contacts
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-500 text-sm">
          {scope === "mine" ? "You haven't created any contacts yet." : "No contacts match your filters right now."}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Lecturers Section */}
          <section>
            <h2 className="text-2xl font-bold text-stone-900 mb-4">Lecturers</h2>
            {lecturers.length === 0 ? (
              <p className="text-sm text-stone-500 italic">No lecturers found.</p>
            ) : (
              <ul className="space-y-4">{lecturers.map(renderContactCard)}</ul>
            )}
          </section>

          {/* TAs Section */}
          <section>
            <h2 className="text-2xl font-bold text-stone-900 mb-4">TAs</h2>
            {tas.length === 0 ? (
              <p className="text-sm text-stone-500 italic">No TAs found.</p>
            ) : (
              <ul className="space-y-4">{tas.map(renderContactCard)}</ul>
            )}
          </section>
        </div>
      )}
    </FilterableLayout>
  );
}