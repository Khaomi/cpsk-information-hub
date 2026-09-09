"use client";

import Link from "next/link";
import { ArrowLeft, FileText, HelpCircle, Calendar, Users, Link as LinkIcon } from "lucide-react";

type ContentTypeOption = {
  label: string;
  description: string;
  href: string | null; // null = not built yet ("Coming soon")
  icon: typeof FileText;
};

const CONTENT_TYPES: ContentTypeOption[] = [
  {
    label: "Announcement",
    description: "Time-sensitive updates like exams, events, or closures",
    href: "/announcements/new",
    icon: FileText,
  },
  {
    label: "FAQ",
    description: "A recurring question and its answer",
    href: null,
    icon: HelpCircle,
  },
  {
    label: "Schedule",
    description: "An event with a date, time, and location",
    href: null,
    icon: Calendar,
  },
  {
    label: "Contact",
    description: "Staff or TA contact details",
    href: null,
    icon: Users,
  },
  {
    label: "Resource Link",
    description: "A shared document, video, or external link",
    href: null,
    icon: LinkIcon,
  },
];

export default function NewContentPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link
        href="/announcements"
        className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 transition-colors mb-4 w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>
      <h1 className="text-2xl font-bold mb-1">What would you like to create?</h1>
      <p className="text-sm text-stone-500 mb-6">Choose a content type to continue.</p>

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
                <h2 className="font-semibold text-sm">{type.label}</h2>
                {disabled && (
                  <span className="text-[10px] font-medium bg-stone-200 text-stone-500 rounded-full px-2 py-0.5 ml-auto">
                    Coming soon
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500">{type.description}</p>
            </div>
          );

          return disabled ? (
            <div key={type.label}>{cardContent}</div>
          ) : (
            <Link key={type.label} href={type.href as string}>
              {cardContent}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
