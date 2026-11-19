"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import FilterPanel, { CheckedFilters } from "@/src/components/filter-panel";
import { useMobileFilters } from "@/src/components/mobile-filters-context";
import { useState } from "react";

type FilterableLayoutProps = {
  children: React.ReactNode;
  onApplyFilter?: (selectedTags: string[]) => void;
};

// Wraps a page's main content with the tag filter panel.
// - Tablet and desktop (md, 768px and up): the panel sits in a column on the
//   right, always visible.
// - Phone (below md): the panel is hidden and opens as a slide-in drawer from
//   Header's "Filters" button, which is only shown below md.
// Both share the same checked state, so selections survive a resize.
export default function FilterableLayout({ children, onApplyFilter }: FilterableLayoutProps) {
  const t = useTranslations();
  const [checked, setChecked] = useState<CheckedFilters>({});
  const { isOpen: filtersOpen, close: closeFilters } = useMobileFilters();

  const handleApply = (selectedTags: string[]): void => {
    onApplyFilter?.(selectedTags);
    closeFilters();
  };

  return (
    <>
      <div className="md:flex md:items-start md:gap-6">
        <div className="min-w-0 md:flex-1">{children}</div>

        {/* Capped at the screen height (minus the 1.5rem top offset and the
            same gap below), so a long panel scrolls inside the sidebar instead
            of running off screen with the Search button out of reach. */}
        <aside
          aria-label={t("filters.drawer.title")}
          className="hidden md:block md:w-60 lg:w-64 shrink-0 md:sticky md:top-6 md:max-h-[calc(100dvh-3rem)] md:overflow-y-auto"
        >
          <FilterPanel checked={checked} onChange={setChecked} onApply={handleApply} />
        </aside>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={closeFilters} />
          <div className="absolute right-0 top-0 h-full w-full max-w-xs bg-stone-50 shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
              <span className="font-semibold text-sm">{t("filters.drawer.title")}</span>
              <button
                type="button"
                onClick={closeFilters}
                aria-label={t("filters.drawer.closeAriaLabel")}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-stone-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3">
              <FilterPanel checked={checked} onChange={setChecked} onApply={handleApply} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
