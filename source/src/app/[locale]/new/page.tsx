"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { ArrowLeft, FileText, HelpCircle, Calendar, Users, Link as LinkIcon } from "lucide-react";

type ContentTypeOption = {
  labelKey: string;
  descriptionKey: string;
  href: string | null; // null = not built yet ("Coming soon")
  icon: typeof FileText;
};

const CONTENT_TYPES: ContentTypeOption[] = [
  {
    labelKey: "newContent.types.announcement.label",
    descriptionKey: "newContent.types.announcement.description",
    href: "/announcements/new",
    icon: FileText,
  },
  {
    labelKey: "newContent.types.faq.label",
    descriptionKey: "newContent.types.faq.description",
    href: null,
    icon: HelpCircle,
  },
  {
    labelKey: "newContent.types.schedule.label",
    descriptionKey: "newContent.types.schedule.description",
    href: null,
    icon: Calendar,
  },
  {
    labelKey: "newContent.types.contact.label",
    descriptionKey: "newContent.types.contact.description",
    href: null,
    icon: Users,
  },
  {
    labelKey: "newContent.types.resourceLink.label",
    descriptionKey: "newContent.types.resourceLink.description",
    href: null,
    icon: LinkIcon,
  },
];

export default function NewContentPage() {
  const t = useTranslations();
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link
        href="/announcements"
        className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 transition-colors mb-4 w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("common.back")}
      </Link>
      <h1 className="text-2xl font-bold mb-1">{t("newContent.heading")}</h1>
      <p className="text-sm text-stone-500 mb-6">{t("newContent.description")}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CONTENT_TYPES.map((type) => {
          const Icon = type.icon;
          const disabled = type.href === null;

          const cardContent = (
            <div
              className={`rounded-lg border p-4 h-full transition-colors ${
                disabled
                  ? "border-stone-200 bg-stone-50 opacity-60 cursor-not-allowed"
                  : "border-stone-200 bg-white hover:border-teal-400 cursor-pointer"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-5 h-5 ${disabled ? "text-stone-400" : "text-teal-600"}`} />
                <h2 className="font-semibold text-sm">{t(type.labelKey)}</h2>
                {disabled && (
                  <span className="text-[10px] font-medium bg-stone-200 text-stone-500 rounded-full px-2 py-0.5 ml-auto">
                    {t("newContent.comingSoon")}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500">{t(type.descriptionKey)}</p>
            </div>
          );

          return disabled ? (
            <div key={type.labelKey}>{cardContent}</div>
          ) : (
            <Link key={type.labelKey} href={type.href as string}>
              {cardContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
