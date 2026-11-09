"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { LogOut, User, SlidersHorizontal, Plus } from "lucide-react";
import { useRole } from "@/src/components/role-context";
import { Link, useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/src/lib/supabase/client";
import { fetchTags, subscribeToTags, Tag } from "@/src/lib/tags";

// Matches the Tag entity from Appendix A / the Prisma schema:
// each filter group corresponds to a category of tags in the database.
// NOTE: the group `label` below is translated UI chrome, but each group's
// `options` are Tag-entity values (DB-backed), so they are intentionally
// left untranslated — see the i18n rollout's flagged-strings note.
export type FilterGroup = {
  label: string;
  labelKey: string;
  options: string[];
};

export type CheckedFilters = Record<string, string[]>;

// Tag category (public.tag_category enum) -> group id + translation key.
// Tags without a known category fall into the "Other" group.
const CATEGORY_GROUPS: Record<string, { label: string; labelKey: string }> = {
  year: { label: "Year", labelKey: "filters.groups.year" },
  course: { label: "Course", labelKey: "filters.groups.course" },
  activity: { label: "Activity", labelKey: "filters.groups.activity" },
};
const OTHER_GROUP = { label: "Other", labelKey: "filters.groups.other" };

type FilterPanelProps = {
  checked: CheckedFilters;
  onChange: (next: CheckedFilters) => void;
  // Called with the flat list of selected tag names when "Search" is pressed —
  // wire this to your API call, e.g. GET /api/content?tags=Year+1,CS101
  onApply: (selectedTags: string[]) => void;
};

export default function FilterPanel({ checked, onChange, onApply }: FilterPanelProps) {
  const t = useTranslations();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [groups, setGroups] = useState<FilterGroup[]>([]);
  const [tagQuery, setTagQuery] = useState("");
  const [loadError, setLoadError] = useState<boolean>(false);

    const { user, isStaff } = useRole();
    const router = useRouter();

  useEffect(() => {
    const loadTags = (): void => {
      fetchTags()
        .then((tags: Tag[]) => {
          const grouped = new Map<string, FilterGroup>();
          for (const tag of tags) {
            const meta = (tag.category && CATEGORY_GROUPS[tag.category]) || OTHER_GROUP;
            const group = grouped.get(meta.label) ?? { ...meta, options: [] };
            group.options.push(tag.name);
            grouped.set(meta.label, group);
          }
          setGroups(
            [...grouped.values()].map((group) => ({
              ...group,
              options: group.options.sort((a, b) => a.localeCompare(b)),
            })),
          );
          setLoadError(false);
        })
        .catch(() => setLoadError(true));
    };
    loadTags();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const scheduleReload = (): void => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(loadTags, 200);
    };
    const unsubscribe = subscribeToTags(scheduleReload);
    return () => {
      if (timeout) clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const toggleGroupOpen = (label: string): void =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const toggleOption = (groupLabel: string, option: string): void => {
    const current = checked[groupLabel] ?? [];
    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    onChange({ ...checked, [groupLabel]: next });
  };

  const allSelected: string[] = Object.values(checked).flat();
  const clearAll = (): void => onChange({});

    const handleAccountClick = async (): Promise<void> => {
      if (!user) return;
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/auth/login");
      router.refresh();
    };

  return (
    <div className="rounded-lg bg-rose-50 border border-rose-100 overflow-hidden">
      <div className="bg-rose-800 px-3 py-3 flex justify-center">
        <Search className="w-4 h-4 text-white" aria-hidden="true" />
      </div>

      <div className="divide-y divide-rose-200">
        <div className="p-3 bg-rose-50">
          <input
            type="search"
            value={tagQuery}
            onChange={(event) => setTagQuery(event.target.value)}
            placeholder={t("filters.findTag.placeholder")}
            aria-label={t("filters.findTag.ariaLabel")}
            className="w-full rounded-md border border-rose-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-400"
          />
          {loadError && <p className="mt-2 text-xs text-red-700">{t("filters.loadError")}</p>}
        </div>
        {groups.map((group) => (
          <div key={group.label}>
            <button
              type="button"
              onClick={() => toggleGroupOpen(group.label)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm bg-rose-800/90 hover:bg-rose-800 transition-colors"
            >
              <span className="text-white flex items-center gap-1.5">
                {t(group.labelKey)}
                {(checked[group.label]?.length ?? 0) > 0 && (
                  <span className="text-[11px] bg-white/25 rounded-full px-1.5">
                    {checked[group.label].length}
                  </span>
                )}
              </span>
              {openGroups[group.label] ? (
                <ChevronUp className="w-4 h-4 text-white" />
              ) : (
                <ChevronDown className="w-4 h-4 text-white" />
              )}
            </button>
            {openGroups[group.label] && (
              <div className="px-4 py-3 bg-amber-50 text-sm text-stone-800 space-y-2">
                {group.options
                  .filter((opt) => opt.toLowerCase().includes(tagQuery.trim().toLowerCase()))
                  .map((opt) => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(checked[group.label] ?? []).includes(opt)}
                      onChange={() => toggleOption(group.label, opt)}
                      className="w-4 h-4 rounded border-stone-400 text-rose-700 focus:ring-rose-600"
                    />
                    <span>{opt}</span>
                  </label>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-3 flex gap-2 bg-rose-50">
        <button
          type="button"
          onClick={() => onApply(allSelected)}
          className="flex-1 rounded-md bg-rose-800 text-white text-sm font-medium py-2 hover:bg-rose-900 transition-colors flex items-center justify-center gap-1.5"
        >
          <Search className="w-3.5 h-3.5" />
          {t("filters.search")}{allSelected.length > 0 ? ` (${allSelected.length})` : ""}
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={allSelected.length === 0}
          className="rounded-md border border-rose-300 text-rose-800 text-sm font-medium px-3 py-2 hover:bg-rose-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {t("filters.clear")}
        </button>

                  {user ? (
                    <button
                      type="button"
                      onClick={handleAccountClick}
                      aria-label={t("header.account.signOut")}
                      title={user.displayName ?? user.email ?? t("header.account.signOut")}
                      className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-stone-600" />
                    </button>
                  ) : (
                    <Link
                      href="/auth/login"
                      aria-label={t("header.account.signIn")}
                      className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
                    >
                      <User className="w-4 h-4 text-stone-600" />
                    </Link>
                  )}
      </div>
    </div>
  );
}
