"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/src/i18n/navigation";
import { routing } from "@/src/i18n/routing";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center rounded-md border border-stone-200 overflow-hidden text-xs font-medium">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => router.replace(pathname, { locale: loc })}
          aria-pressed={locale === loc}
          className={`px-2 py-1 transition-colors ${
            locale === loc
              ? "bg-stone-800 text-white"
              : "bg-white text-stone-600 hover:bg-stone-100"
          }`}
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
