import { createClient } from "@/src/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import type { ResourceLinkFormValues } from "@/src/components/resource-link-form.tsx";
import type { Tag } from "@/src/lib/tags";
import { formatDisplayDate, toDateTimeInputValue } from "@/src/lib/announcements";

export type ResourceLinkStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";


export type ResourceLink = {
  id: string;
  title: string;
  url: string;
  startsAt: string | null;
  endsAt: string | null;
  draftStartsAt: string | null;
  draftEndsAt: string | null;
  status: ResourceLinkStatus;
  creatorId: string;
  authorName: string;
  tags: Tag[];
};

type ResourceLinkViewRow = Tables<"resource_link_with_details">;
type SupabaseClient = ReturnType<typeof createClient>;

export { formatDisplayDate, toDateTimeInputValue };

async function attachTags(supabase: SupabaseClient, rows: ResourceLinkViewRow[]): Promise<ResourceLink[]> {
  const ids = rows.map((r) => r.id).filter((id): id is string => id !== null);
  const tagsByResourceLink = new Map<string, Tag[]>();

  if (ids.length > 0) {
    const { data: tagLinks, error: tagError } = await supabase
      .from("resource_link_tag")
      .select("resource_link_id, tag:tag(id, name, category)")
      .in("resource_link_id", ids);
    if (tagError) throw tagError;

    for (const link of tagLinks ?? []) {
      if (!link.tag) continue;
      const list = tagsByResourceLink.get(link.resource_link_id) ?? [];
      list.push(link.tag);
      tagsByResourceLink.set(link.resource_link_id, list);
    }
  }

  return rows.map((row) => ({
    id: row.id as string,
    title: row.title ?? "",
    url: row.url ?? "",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    draftStartsAt: row.draft_starts_at,
    draftEndsAt: row.draft_ends_at,
    status: (row.status ?? "DRAFT") as ResourceLinkStatus,
    creatorId: row.creator_id as string,
    authorName: row.author_name ?? "Unknown",
    tags: tagsByResourceLink.get(row.id as string) ?? [],
  }));
}

export async function fetchResourceLinks(): Promise<ResourceLink[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("resource_link_with_details")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return attachTags(supabase, data ?? []);
}

export async function fetchResourceLinkById(id: string): Promise<ResourceLink | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("resource_link_with_details")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [result] = await attachTags(supabase, [data]);
  return result;
}

type ComputedDates = {
  starts_at: string | null;
  ends_at: string | null;
  draft_starts_at: string | null;
  draft_ends_at: string | null;
};

// Same logic as announcements
function computeDates(values: ResourceLinkFormValues, status: "draft" | "published"): ComputedDates {
  const draft_starts_at = values.publishedDate ? new Date(values.publishedDate).toISOString() : null;
  const draft_ends_at = values.expiryDate ? new Date(values.expiryDate).toISOString() : null;

  if (status === "draft") {
    return { starts_at: null, ends_at: null, draft_starts_at, draft_ends_at };
  }
  return { starts_at: draft_starts_at, ends_at: draft_ends_at, draft_starts_at, draft_ends_at };
}

async function syncTags(supabase: SupabaseClient, resourceLinkId: string, tagIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from("resource_link_tag")
    .delete()
    .eq("resource_link_id", resourceLinkId);
  if (deleteError) throw deleteError;

  if (tagIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("resource_link_tag")
    .insert(tagIds.map((tagId) => ({ resource_link_id: resourceLinkId, tag_id: tagId })));
  if (insertError) throw insertError;
}

export async function insertResourceLink(
  values: ResourceLinkFormValues,
  status: "draft" | "published",
  creatorId: string,
): Promise<string> {
  const supabase = createClient();
  const { starts_at, ends_at, draft_starts_at, draft_ends_at } = computeDates(values, status);
  const { data, error } = await supabase
    .from("resource_link")
    .insert({
      title: values.title,
      url: values.url,
      creator_id: creatorId,
      starts_at,
      ends_at,
      draft_starts_at,
      draft_ends_at,
    })
    .select("id")
    .single();
  if (error) throw error;

  await syncTags(supabase, data.id, values.tagIds);

  return data.id;
}

export async function updateResourceLink(
  id: string,
  values: ResourceLinkFormValues,
  status: "draft" | "published",
): Promise<void> {
  const supabase = createClient();
  const { starts_at, ends_at, draft_starts_at, draft_ends_at } = computeDates(values, status);
  const { error } = await supabase
    .from("resource_link")
    .update({ title: values.title, url: values.url, starts_at, ends_at, draft_starts_at, draft_ends_at })
    .eq("id", id);
  if (error) throw error;

  await syncTags(supabase, id, values.tagIds);
}


export async function setResourceLinkActive(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("resource_link")
    .update({ starts_at: new Date().toISOString(), ends_at: null })
    .eq("id", id);
  if (error) throw error;
}

// Same as setAnnouncementArchived: the view compares
export async function setResourceLinkArchived(id: string, currentStartsAt: string | null): Promise<void> {
  const supabase = createClient();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const needsStartsAt = !currentStartsAt || new Date(currentStartsAt).getTime() > new Date(yesterday).getTime();

  const { error } = await supabase
    .from("resource_link")
    .update({ ends_at: yesterday, ...(needsStartsAt ? { starts_at: yesterday } : {}) })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteResourceLink(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("resource_link").delete().eq("id", id);
  if (error) throw error;
}

type Unsubscribe = () => void;

export function subscribeToResourceLinks(onChange: () => void): Unsubscribe {
  const supabase = createClient();
  const channel = supabase
    .channel("resource-links-list-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "resource_link" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "resource_link_tag" }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToResourceLink(id: string, onChange: () => void): Unsubscribe {
  const supabase = createClient();
  const channel = supabase
    .channel(`resource-link-${id}-changes`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "resource_link", filter: `id=eq.${id}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "resource_link_tag", filter: `resource_link_id=eq.${id}` },
      onChange,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}