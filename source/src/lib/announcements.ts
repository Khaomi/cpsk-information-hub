import { createClient } from "@/src/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import type { AnnouncementFormValues } from "@/src/components/announcement-form";
import type { Tag } from "@/src/lib/tags";

export type AnnouncementStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

// Matches public.announcement_with_details, plus the tags joined in separately
// (the view itself carries no tag column).
export type Announcement = {
  id: string;
  title: string;
  body: string;
  startsAt: string | null;
  endsAt: string | null;
  // What was last typed into the Published/Expiry Date fields, kept even
  // while the announcement is a draft (starts_at/ends_at stay null for
  // drafts) so re-opening one for editing doesn't lose the date/time.
  draftStartsAt: string | null;
  draftEndsAt: string | null;
  status: AnnouncementStatus;
  creatorId: string;
  authorName: string;
  tags: Tag[];
  imageUrl: string | null;
};

type AnnouncementViewRow = Tables<"announcement_with_details">;
type SupabaseClient = ReturnType<typeof createClient>;

const ANNOUNCEMENT_IMAGES_BUCKET = "announcement-images";

// Public bucket, so the URL is always ${...}/object/public/announcement-images/<path> —
// slicing on that marker recovers the storage path without tracking it separately.
function extractStoragePath(url: string): string | null {
  const marker = `/${ANNOUNCEMENT_IMAGES_BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

// Truncates the body for the summary card
export function summarize(text: string, maxLength: number = 90): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

export function formatDisplayDate(iso: string | null): string {
  if (!iso) return "Not scheduled";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

// Round-trips an ISO timestamp back into the local YYYY-MM-DDTHH:mm an
// <input type="datetime-local"> expects. Must use local getters (not the
// UTC slice this used to be) — datetime-local always reads/writes wall-clock
// local time, never UTC, so slicing the ISO string would shift the display
// by the viewer's UTC offset every time.
export function toDateTimeInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function attachRelations(supabase: SupabaseClient, rows: AnnouncementViewRow[]): Promise<Announcement[]> {
  const ids = rows.map((r) => r.id).filter((id): id is string => id !== null);
  const tagsByAnnouncement = new Map<string, Tag[]>();
  const imageByAnnouncement = new Map<string, string>();

  if (ids.length > 0) {
    const [{ data: tagLinks, error: tagError }, { data: imageLinks, error: imageError }] = await Promise.all([
      supabase
        .from("announcement_tag")
        .select("announcement_id, tag:tag(id, name, category)")
        .in("announcement_id", ids),
      supabase
        .from("announcement_attachment")
        .select("announcement_id, attachment:attachment(url)")
        .in("announcement_id", ids),
    ]);
    if (tagError) throw tagError;
    if (imageError) throw imageError;

    for (const link of tagLinks ?? []) {
      if (!link.tag) continue;
      const list = tagsByAnnouncement.get(link.announcement_id) ?? [];
      list.push(link.tag);
      tagsByAnnouncement.set(link.announcement_id, list);
    }

    // An announcement can have several attachments in the schema, but the
    // form only ever manages one image — take the first and ignore the rest.
    for (const link of imageLinks ?? []) {
      if (!link.attachment || imageByAnnouncement.has(link.announcement_id)) continue;
      imageByAnnouncement.set(link.announcement_id, link.attachment.url);
    }
  }

  return rows.map((row) => ({
    id: row.id as string,
    title: row.title ?? "",
    body: row.body ?? "",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    draftStartsAt: row.draft_starts_at,
    draftEndsAt: row.draft_ends_at,
    status: (row.status ?? "DRAFT") as AnnouncementStatus,
    creatorId: row.creator_id as string,
    authorName: row.author_name ?? "Unknown",
    tags: tagsByAnnouncement.get(row.id as string) ?? [],
    imageUrl: imageByAnnouncement.get(row.id as string) ?? null,
  }));
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("announcement_with_details")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return attachRelations(supabase, data ?? []);
}

export async function fetchAnnouncementById(id: string): Promise<Announcement | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("announcement_with_details")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [result] = await attachRelations(supabase, [data]);
  return result;
}

type ComputedDates = {
  starts_at: string | null;
  ends_at: string | null;
  draft_starts_at: string | null;
  draft_ends_at: string | null;
};

// starts_at/ends_at drive the announcement's live status (see the view), so
// a draft must keep them null no matter what's in the form — otherwise
// picking a past/today date and clicking "Save as Draft" would make it go
// live immediately. draft_starts_at/draft_ends_at instead just remember
// whatever was typed, published or not, so the date/time is never lost —
// Publish uses the chosen dates as-is, which also lets a future Published
// Date act as a schedule (the view flips DRAFT -> ACTIVE once it arrives).
function computeDates(values: AnnouncementFormValues, status: "draft" | "published"): ComputedDates {
  const draft_starts_at = values.publishedDate ? new Date(values.publishedDate).toISOString() : null;
  const draft_ends_at = values.expiryDate ? new Date(values.expiryDate).toISOString() : null;

  if (status === "draft") {
    return { starts_at: null, ends_at: null, draft_starts_at, draft_ends_at };
  }
  return { starts_at: draft_starts_at, ends_at: draft_ends_at, draft_starts_at, draft_ends_at };
}

async function uploadAnnouncementImage(supabase: SupabaseClient, file: File, creatorId: string): Promise<string> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  const path = `${creatorId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

  const { error: uploadError } = await supabase.storage.from(ANNOUNCEMENT_IMAGES_BUCKET).upload(path, file);
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(ANNOUNCEMENT_IMAGES_BUCKET).getPublicUrl(path);

  const { data, error } = await supabase
    .from("attachment")
    .insert({ creator_id: creatorId, filename: file.name, filesize: file.size, url: publicUrl })
    .select("id")
    .single();
  if (error) throw error;

  return data.id as string;
}

// Unlinks and fully deletes any image currently attached to an announcement
// (storage object + attachment row), used both for an explicit "Remove" and
// before uploading a replacement.
async function clearAnnouncementImage(supabase: SupabaseClient, announcementId: string): Promise<void> {
  const { data: links, error } = await supabase
    .from("announcement_attachment")
    .select("attachment_id, attachment:attachment(url)")
    .eq("announcement_id", announcementId);
  if (error) throw error;
  if (!links || links.length === 0) return;

  const { error: unlinkError } = await supabase
    .from("announcement_attachment")
    .delete()
    .eq("announcement_id", announcementId);
  if (unlinkError) throw unlinkError;

  for (const link of links) {
    const path = link.attachment ? extractStoragePath(link.attachment.url) : null;
    if (path) {
      await supabase.storage.from(ANNOUNCEMENT_IMAGES_BUCKET).remove([path]);
    }
    await supabase.from("attachment").delete().eq("id", link.attachment_id);
  }
}

async function syncTags(supabase: SupabaseClient, announcementId: string, tagIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from("announcement_tag")
    .delete()
    .eq("announcement_id", announcementId);
  if (deleteError) throw deleteError;

  if (tagIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("announcement_tag")
    .insert(tagIds.map((tagId) => ({ announcement_id: announcementId, tag_id: tagId })));
  if (insertError) throw insertError;
}

export async function insertAnnouncement(
  values: AnnouncementFormValues,
  status: "draft" | "published",
  creatorId: string,
): Promise<string> {
  const supabase = createClient();
  const { starts_at, ends_at, draft_starts_at, draft_ends_at } = computeDates(values, status);
  const { data, error } = await supabase
    .from("announcement")
    .insert({
      title: values.title,
      body: values.body,
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

  if (values.imageFile) {
    const attachmentId = await uploadAnnouncementImage(supabase, values.imageFile, creatorId);
    const { error: linkError } = await supabase
      .from("announcement_attachment")
      .insert({ announcement_id: data.id, attachment_id: attachmentId });
    if (linkError) throw linkError;
  }

  return data.id;
}

export async function updateAnnouncement(
  id: string,
  values: AnnouncementFormValues,
  status: "draft" | "published",
  editorId: string,
): Promise<void> {
  const supabase = createClient();
  const { starts_at, ends_at, draft_starts_at, draft_ends_at } = computeDates(values, status);
  const { error } = await supabase
    .from("announcement")
    .update({ title: values.title, body: values.body, starts_at, ends_at, draft_starts_at, draft_ends_at })
    .eq("id", id);
  if (error) throw error;

  await syncTags(supabase, id, values.tagIds);

  if (values.removeImage || values.imageFile) {
    await clearAnnouncementImage(supabase, id);
  }

  if (values.imageFile) {
    const attachmentId = await uploadAnnouncementImage(supabase, values.imageFile, editorId);
    const { error: linkError } = await supabase
      .from("announcement_attachment")
      .insert({ announcement_id: id, attachment_id: attachmentId });
    if (linkError) throw linkError;
  }
}

// Shared by the quick "Publish" (draft -> active) and "Restore to Published"
// (archived -> active) actions — both just mean "make it live right now".
export async function setAnnouncementActive(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("announcement")
    .update({ starts_at: new Date().toISOString(), ends_at: null })
    .eq("id", id);
  if (error) throw error;
}

// The view compares CURRENT_DATE > ends_at::DATE (strictly), so ends_at must
// be set to a past instant to archive immediately rather than tomorrow. If
// starts_at is null or still in the future, it's pulled back to match so the
// ends_at >= starts_at CHECK constraint still holds.
export async function setAnnouncementArchived(id: string, currentStartsAt: string | null): Promise<void> {
  const supabase = createClient();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const needsStartsAt = !currentStartsAt || new Date(currentStartsAt).getTime() > new Date(yesterday).getTime();

  const { error } = await supabase
    .from("announcement")
    .update({ ends_at: yesterday, ...(needsStartsAt ? { starts_at: yesterday } : {}) })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const supabase = createClient();
  // The announcement_attachment link is cascade-deleted with the announcement,
  // but the attachment row and its storage file are not — clear them first.
  await clearAnnouncementImage(supabase, id);
  const { error } = await supabase.from("announcement").delete().eq("id", id);
  if (error) throw error;
}

type Unsubscribe = () => void;

// Both tables are already in the supabase_realtime publication with
// REPLICA IDENTITY FULL (see the announcement/announcement_tag migration),
// and Realtime enforces the same "anyone can SELECT" RLS policy those
// tables carry, so this is safe to open for any viewer, staff or student.
export function subscribeToAnnouncements(onChange: () => void): Unsubscribe {
  const supabase = createClient();
  const channel = supabase
    .channel("announcements-list-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "announcement" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "announcement_tag" }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToAnnouncement(id: string, onChange: () => void): Unsubscribe {
  const supabase = createClient();
  const channel = supabase
    .channel(`announcement-${id}-changes`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "announcement", filter: `id=eq.${id}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "announcement_tag", filter: `announcement_id=eq.${id}` },
      onChange,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
