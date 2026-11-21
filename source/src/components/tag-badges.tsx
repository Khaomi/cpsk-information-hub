"use client";

import { colorForTag, type Tag } from "@/src/lib/tags";
import { DepartmentOnlyBadge } from "@/src/components/department-only";

type TagBadgesProps = {
  tags: Tag[];
  departmentOnly: boolean;
  // Text size class for the tag pills (lists and detail pages differ slightly)
  textClassName?: string;
};

// The "Department only" badge (when set) followed by one coloured pill per
// tag. Renders no wrapper, so each caller keeps its own spacing/layout.
export function TagBadges({ tags, departmentOnly, textClassName = "text-xs" }: TagBadgesProps) {
  return (
    <>
      {departmentOnly && <DepartmentOnlyBadge />}
      {tags.map((tag) => (
        <span key={tag.id} className={`${textClassName} font-medium px-2 py-0.5 rounded-full ${colorForTag(tag)}`}>
          {tag.name}
        </span>
      ))}
    </>
  );
}
