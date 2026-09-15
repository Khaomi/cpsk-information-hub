"use client";

import { useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";

// Matches the Tag entity from Appendix A / the Prisma schema:
// each filter group corresponds to a category of tags in the database.
export type FilterGroup = {
  label: string;
  options: string[];
};

export type CheckedFilters = Record<string, string[]>;

const FILTER_GROUPS: FilterGroup[] = [
  { label: "Year", options: ["Year 1", "Year 2", "Year 3", "Year 4"] },
  { label: "Course", options: ["CS101", "CS201", "SE305"] },
  { label: "For who", options: ["Students", "Lecturers", "TAs"] },
  { label: "Activity", options: ["Undergraduate Research", "Open House", "Year Meeting", "Job Fair"] },
];

type FilterPanelProps = {
  checked: CheckedFilters;
  onChange: (next: CheckedFilters) => void;
  // Called with the flat list of selected tag names when "Search" is pressed —
  // wire this to your API call, e.g. GET /api/content?tags=Year+1,CS101
  onApply: (selectedTags: string[]) => void;
};

export default function FilterPanel({ checked, onChange, onApply }: FilterPanelProps) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

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

  return (
    <div className="rounded-lg bg-rose-50 border border-rose-100 overflow-hidden">
      <div className="bg-rose-800 px-3 py-3 flex justify-center">
        <Search className="w-4 h-4 text-white" aria-hidden="true" />
      </div>

      <div className="divide-y divide-rose-200">
        {FILTER_GROUPS.map((group) => (
          <div key={group.label}>
            <button
              type="button"
              onClick={() => toggleGroupOpen(group.label)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm bg-rose-800/90 hover:bg-rose-800 transition-colors"
            >
              <span className="text-white flex items-center gap-1.5">
                {group.label}
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
                {group.options.map((opt) => (
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
          Search{allSelected.length > 0 ? ` (${allSelected.length})` : ""}
        </button>
        <button
          type="button"
          onClick={clearAll}
          disabled={allSelected.length === 0}
          className="rounded-md border border-rose-300 text-rose-800 text-sm font-medium px-3 py-2 hover:bg-rose-100 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
