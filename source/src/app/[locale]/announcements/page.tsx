"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/src/i18n/navigation";
import FilterableLayout from "@/src/components/filterable-layout";
import {
  Announcement,
  AnnouncementScope,
  fetchAnnouncements,
  filterAnnouncements,
  setAnnouncementActive,
  setAnnouncementArchived,
  deleteAnnouncement,
  subscribeToAnnouncements,
} from "@/src/lib/announcements";
import { useRole } from "@/src/components/role-context";
import { useDebouncedSubscription } from "@/src/lib/use-debounced-subscription";
import AnnouncementCard from "@/src/components/announcements/announcement-card";
import type { ConfirmAction } from "@/src/components/announcements/announcement-staff-actions";

export default function AnnouncementsPage() {
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const { user, isStaff } = useRole();
  const searchParams = useSearchParams();

  const query = (searchParams.get("query") ?? "").trim().toLowerCase();
  const selectedTags = searchParams.getAll("tag");

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<AnnouncementScope>("all");
  const [confirming, setConfirming] = useState<{ id: string; type: ConfirmAction } | null>(null);
  const [publishErrors, setPublishErrors] = useState<Record<string, string>>({});

  const loadItems = (): void => {
    fetchAnnouncements()
      .then(setItems)
      .catch((err) => {
        console.error("Failed to load announcements:", err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Live-refresh the list when any announcement or tag link changes
  useDebouncedSubscription(subscribeToAnnouncements, loadItems);

  const visibleItems = filterAnnouncements(items, { isStaff, scope, userId: user?.id, query, tagNames: selectedTags });

  const handleArchive = async (a: Announcement): Promise<void> => {
    await setAnnouncementArchived(a.id, a.startsAt);
    setConfirming(null);
    loadItems();
  };

  const handleDeletePermanently = async (id: string): Promise<void> => {
    await deleteAnnouncement(id);
    setConfirming(null);
    loadItems();
  };

  // Shared by "quick publish" (draft → published) and "restore" (archived → published).
  // SRS-9 still applies in both directions: at least one tag is required.
  const handlePublish = async (item: Announcement): Promise<void> => {
    if (item.tags.length === 0) {
      setPublishErrors((prev) => ({ ...prev, [item.id]: t("validation.selectTagBeforePublish") }));
      return;
    }
    setPublishErrors((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    await setAnnouncementActive(item.id);
    loadItems();
  };

  const handleApplyFilter = (tagNames: string[]): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tag");
    tagNames.forEach((tag) => params.append("tag", tag));
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <FilterableLayout onApplyFilter={handleApplyFilter}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t("common.latestNews")}</h1>
        {isStaff && <ScopeToggle scope={scope} onChange={setScope} />}
      </div>

      {loading ? (
        <p className="text-sm text-stone-500">{t("common.loading")}</p>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-stone-500 text-sm">
          {emptyMessage(query, scope)}
          {scope === "mine" ? t("announcements.empty.mine") : t("announcements.empty.all")}
        </div>
      ) : (
        <ul className="space-y-4">
          {visibleItems.map((a) => (
            <AnnouncementCard
              key={a.id}
              announcement={a}
              isStaff={isStaff}
              publishError={publishErrors[a.id]}
              confirming={confirming?.id === a.id ? confirming.type : null}
              onPublish={() => handlePublish(a)}
              onRequestConfirm={(type) => setConfirming({ id: a.id, type })}
              onCancelConfirm={() => setConfirming(null)}
              onArchive={() => handleArchive(a)}
              onDelete={() => handleDeletePermanently(a.id)}
            />
          ))}
        </ul>
      )}
    </FilterableLayout>
  );
}

function emptyMessage(query: string, scope: AnnouncementScope): string {
  if (query) return "No announcements match your search.";
  if (scope === "mine") return "You haven't created any announcements yet.";
  return "No announcements match your filters right now.";
}

// Staff can switch between every announcement and only their own
function ScopeToggle({ scope, onChange }: { scope: AnnouncementScope; onChange: (scope: AnnouncementScope) => void }) {
  const t = useTranslations();
  const options: { value: AnnouncementScope; labelKey: string }[] = [
    { value: "all", labelKey: "announcements.scope.all" },
    { value: "mine", labelKey: "announcements.scope.mine" },
  ];

  return (
    <div className="flex rounded-md border border-stone-300 overflow-hidden text-sm">
      {options.map(({ value, labelKey }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`px-3 py-1.5 transition-colors ${
            scope === value ? "bg-teal-600 text-white" : "bg-white text-stone-700 hover:bg-stone-50"
          }`}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}
