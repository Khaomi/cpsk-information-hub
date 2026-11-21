"use client";

import type { ReactNode } from "react";
import { colorForTag, type Tag } from "@/src/lib/tags";
import { FieldError } from "@/src/components/form-field";

type TagPickerProps = {
  legend: ReactNode;
  hint?: ReactNode;
  tags: Tag[]; // every tag the user can pick from
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  emptyLabel: ReactNode; // shown when there are no tags at all
  error?: string;
};

// Adds the id if it isn't selected yet, removes it if it is
export function toggleId(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
}

// Row of toggle buttons for choosing tags in a create/edit form
export function TagPicker({ legend, hint, tags, selectedIds, onChange, emptyLabel, error }: TagPickerProps) {
  return (
    <fieldset>
      <legend className="block text-sm font-medium text-stone-700 mb-1">
        {legend}
        {hint && (
          <>
            {" "}
            <span className="text-stone-400 font-normal">{hint}</span>
          </>
        )}
      </legend>
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 && <p className="text-xs text-stone-400">{emptyLabel}</p>}
        {tags.map((tag) => {
          const selected = selectedIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => onChange(toggleId(selectedIds, tag.id))}
              aria-pressed={selected}
              className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                selected ? "bg-teal-600 border-teal-600 text-white" : `${colorForTag(tag)} border-transparent hover:border-teal-400`
              }`}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
      <FieldError message={error} />
    </fieldset>
  );
}
