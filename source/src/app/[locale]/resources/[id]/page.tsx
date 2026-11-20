"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import FilterableLayout from "@/src/components/filterable-layout";
import { formatDisplayDate } from "@/src/lib/announcements";
import { ResourceLink, fetchResourceLinks, subscribeToResourceLinks } from "@/src/lib/resourceLinks";
import { colorForTag } from "@/src/lib/tags";
import { useRole } from "@/src/components/role-context";
import { DepartmentOnlyBadge } from "@/src/components/department-only";

type Props = {
  // In current Next.js, params is a Promise, not a plain object —
  // must be unwrapped with use() before reading .id
  params: Promise<{ id: string }>;
};

export default function ResourceLinkDetailPage({ params }: Props) {
  const { id } = use(params);
  const t = useTranslations();
  const router = useRouter();
  const { isStaff } = useRole();

  const [resourceLink, setResourceLink] = useState<ResourceLink | null>(null);
  const [loading, setLoading] = useState(true);

  const loadItem = (): Promise<void> =>
    fetchResourceLinks()
      .then((links) => setResourceLink(links.find((rl) => rl.id === id) ?? null))
      .catch(() => setResourceLink(null));

  useEffect(() => {
    loadItem().finally(() => setLoading(false));
  }, [id]);

  // Live-refresh when the resource link changes elsewhere.
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const scheduleReload = (): void => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(loadItem, 300);
    };

    const unsubscribe = subscribeToResourceLinks(scheduleReload);
    return () => {
      if (timeout) clearTimeout(timeout);
      unsubscribe();
    };
  }, [id]);

  // Send the user to the main feed with the chosen tags applied.
  const handleApplyFilter = (selectedTags: string[]): void => {
    const params = new URLSearchParams();
    selectedTags.forEach((tag) => params.append("tag", tag));
    router.push(`/?${params.toString()}`);
  };

  if (loading) {
    return (
      <FilterableLayout onApplyFilter={handleApplyFilter}>
        <p className="text-sm text-stone-500">{t("common.loading")}</p>
      </FilterableLayout>
    );
  }

  // Non-staff can only see ACTIVE items, same as the home feed.
  if (!resourceLink || (!isStaff && resourceLink.status !== "ACTIVE")) {
    return (
      <FilterableLayout onApplyFilter={handleApplyFilter}>
        <p className="text-sm text-stone-500">{t("announcements.notFound")}</p>
      </FilterableLayout>
    );
  }

  // Only render a clickable link for http(s) URLs.
  const isSafeUrl = /^https?:\/\//i.test(resourceLink.url);

  return (
    <FilterableLayout onApplyFilter={handleApplyFilter}>
      <article>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-medium text-stone-900">{resourceLink.title}</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {resourceLink.departmentOnly && <DepartmentOnlyBadge />}
          {resourceLink.tags.map((tag) => (
            <span key={tag.id} className={`text-xs font-medium px-2 py-0.5 rounded-full ${colorForTag(tag)}`}>
              {tag.name}
            </span>
          ))}
        </div>

        <p className="text-xs text-stone-400 mb-4">{formatDisplayDate(resourceLink.startsAt)}</p>

        {/* The URL takes the place of the announcement body */}
        <p className="text-sm text-stone-700 leading-relaxed break-words mb-4">
          {isSafeUrl ? (
            <a
              href={resourceLink.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              {resourceLink.url}
            </a>
          ) : (
            resourceLink.url
          )}
        </p>
      </article>
    </FilterableLayout>
  );
}