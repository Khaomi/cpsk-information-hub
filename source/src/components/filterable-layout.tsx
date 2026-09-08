"use client";

import { X } from "lucide-react";
import FilterPanel, { CheckedFilters } from "@/src/components/filter-panel";
import { useMobileFilters } from "@/src/components/mobile-filters-context";
import { useState } from "react";

type FilterableLayoutProps = {
  children: React.ReactNode;
  onApplyFilter?: (selectedTags: string[]) => void;
};

// Wraps a page's main content and provides the filter drawer, opened by
// Header's "Filters" button at every screen size (no separate desktop
// sidebar) — filtering always happens through the same slide-in drawer,
// on phone, tablet, or desktop alike.
export default function FilterableLayout({ children, onApplyFilter }: FilterableLayoutProps) {
  const [checked, setChecked] = useState<CheckedFilters>({});
  const { isOpen: filtersOpen, close: closeFilters } = useMobileFilters();

  const handleApply = (selectedTags: string[]): void => {
    onApplyFilter?.(selectedTags);
    closeFilters();
  };

  return (
    <>
      {children}

      {filtersOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeFilters} />
          <div className="absolute right-0 top-0 h-full w-full max-w-xs sm:w-72 bg-stone-50 shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
              <span className="font-semibold text-sm">Filters</span>
              <button
                type="button"
                onClick={closeFilters}
                aria-label="Close filters"
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
