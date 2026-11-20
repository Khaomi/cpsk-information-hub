"use client";

import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";

// "Department only" means only signed-in users can see the item. Guests
// (not signed in) never receive it: the database policies filter it out (see
// 20261119120000_public_access_and_department_only.sql), so this UI is only
// the switch and the label, not the protection itself.

type DepartmentOnlyFieldProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

// Checkbox for the create/edit forms. New items start ticked, so nothing
// becomes public unless staff untick it on purpose.
export function DepartmentOnlyField({ checked, onChange }: DepartmentOnlyFieldProps) {
  const t = useTranslations();

  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-stone-400 text-teal-600 focus:ring-teal-500"
        />
        <span>
          <span className="block text-sm font-medium text-stone-700">{t("visibility.departmentOnly.label")}</span>
          <span className="block text-xs text-stone-500">
            {checked ? t("visibility.departmentOnly.hintOn") : t("visibility.departmentOnly.hintOff")}
          </span>
        </span>
      </label>
    </div>
  );
}

// Small label for lists and detail pages. Only signed-in users ever see
// department-only items, so it tells them which ones guests can't see.
export function DepartmentOnlyBadge({ className = "" }: { className?: string }) {
  const t = useTranslations();

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 shrink-0 ${className}`}
    >
      <Lock className="w-3 h-3" aria-hidden="true" />
      {t("visibility.departmentOnly.badge")}
    </span>
  );
}
