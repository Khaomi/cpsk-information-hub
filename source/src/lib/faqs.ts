import { createClient } from "@/src/lib/supabase/client";
import type { Database, Tables } from "@/types/database.types";
import type { Tag } from "@/src/lib/tags";

export type FaqStatus = Database["public"]["Enums"]["faq_status"];

export type Faq = {
  id: string;
  question: string;
  description: string | null;
  status: FaqStatus;
  isAnonymous: boolean;
  creatorId: string | null;
  authorId: string | null;
  authorName: string;
  tags: Tag[];
  imageUrl: string | null;
  createdAt: string | null;
};

type FaqViewRow = Tables<"faq_with_details">;
type SupabaseClient = ReturnType<typeof createClient>;
const FAQ_IMAGES_BUCKET = "faq-images";

export function formatDisplayDate(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function summarize(text: string, maxLength: number = 90): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

async function attachRelations(supabase: SupabaseClient, rows: FaqViewRow[]): Promise<Faq[]> {
  const ids = rows.map((r) => r.id).filter((id): id is string => id !== null);
  const tagsByFaq = new Map<string, Tag[]>();
  const imageByFaq = new Map<string, string>();

  if (ids.length > 0) {
    const [{ data: tagLinks, error: tagError }, { data: imageLinks, error: imageError }] = await Promise.all([
      supabase
        .from("faq_tag")
        .select("faq_id, tag:tag(id, name, category)")
        .in("faq_id", ids),
      supabase
        .from("faq_attachment")
        .select("faq_id, attachment:attachment(url)")
        .in("faq_id", ids),
    ]);
    if (tagError) throw tagError;
    if (imageError) throw imageError;

    type TagLinkRow = {
      faq_id: string;
      tag: Tag | Tag[] | null;
    };

    type ImageLinkRow = {
      faq_id: string;
      attachment: { url: string } | { url: string }[] | null;
    };

    for (const link of (tagLinks as TagLinkRow[] | null) ?? []) {
      if (!link.tag) continue;
      const tagObj = Array.isArray(link.tag) ? link.tag[0] : link.tag;
      if (!tagObj) continue;
      const list = tagsByFaq.get(link.faq_id) ?? [];
      list.push(tagObj);
      tagsByFaq.set(link.faq_id, list);
    }

    for (const link of (imageLinks as ImageLinkRow[] | null) ?? []) {
      if (!link.attachment || imageByFaq.has(link.faq_id)) continue;
      const attObj = Array.isArray(link.attachment) ? link.attachment[0] : link.attachment;
      if (attObj?.url) {
        imageByFaq.set(link.faq_id, attObj.url);
      }
    }
  }

  return rows.map((row) => ({
    id: row.id ?? "",
    question: row.question ?? "",
    description: row.description ?? null,
    status: (row.status as FaqStatus) ?? "UNANSWERED",
    isAnonymous: row.is_anonymous ?? true,
    creatorId: row.creator_id ?? null,
    authorId: row.creator_id ?? null,
    authorName: row.author_name ?? "Unknown",
    tags: tagsByFaq.get(row.id ?? "") ?? [],
    imageUrl: imageByFaq.get(row.id ?? "") ?? null,
    createdAt: row.created_at ?? null,
  }));
}

export async function fetchFaqById(id: string): Promise<Faq | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("faq_with_details")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [result] = await attachRelations(supabase, [data]);
  return result;
}

export async function fetchFaqs(): Promise<Faq[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("faq_with_details")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to fetch FAQs");
  }

  return attachRelations(supabase, data ?? []);
}

export async function setFaqResolved(id: string, isResolved: boolean): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("faqs")
    .update({ status: isResolved ? "RESOLVED" : "ANSWERED" })
    .eq("id", id);
  if (error) throw error;
}

export type CreateFaqInput = {
  question: string;
  isAnonymous?: boolean;
  tagIds?: string[];
};

export async function insertFaq(input: CreateFaqInput): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: faq, error: faqError } = await supabase
    .from("faqs")
    .insert({
      question: input.question,
      is_anonymous: input.isAnonymous ?? true,
      creator_id: user?.id ?? null,
      status: "UNANSWERED",
    })
    .select("id")
    .single();

  if (faqError || !faq) {
    throw new Error(faqError?.message || "Failed to create FAQ");
  }

  // 2. Attach tags if provided
  if (input.tagIds && input.tagIds.length > 0) {
    const tagRows = input.tagIds.map((tagId) => ({
      faq_id: faq.id,
      tag_id: tagId,
    }));

    const { error: tagError } = await supabase.from("faq_tag").insert(tagRows);
    if (tagError) {
      throw new Error(tagError.message);
    }
  }

  return faq.id;
}

export function subscribeToFaqs(onChange: () => void) {
  const supabase = createClient();
  const channel = supabase
    .channel("faqs-list-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "faqs" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "faq_tag" }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// New FAQ images go to faq-images. Questions asked before that change stored
// their image in the shared "attachments" bucket, so cleanup handles both.
const FAQ_IMAGE_BUCKETS = [FAQ_IMAGES_BUCKET, "attachments"] as const;

type StoredFile = {
  bucket: string;
  path: string;
};

type FaqAttachmentInfo = {
  attachmentIds: string[];
  files: StoredFile[];
};

function extractStoredFile(url: string): StoredFile | null {
  for (const bucket of FAQ_IMAGE_BUCKETS) {
    const marker = `/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) continue;
    const rawPath = url.slice(idx + marker.length).split("?")[0];
    return rawPath ? { bucket, path: decodeURIComponent(rawPath) } : null;
  }
  return null;
}

async function getFaqAttachments(supabase: SupabaseClient, faqId: string): Promise<FaqAttachmentInfo> {
  type FaqAttachmentLinkRow = {
    attachment_id: string;
    attachment: { url: string } | { url: string }[] | null;
  };

  const { data: links, error } = await supabase
    .from("faq_attachment")
    .select("attachment_id, attachment(url)")
    .eq("faq_id", faqId);
  if (error) throw error;

  const typedLinks = (links as FaqAttachmentLinkRow[] | null) ?? [];

  const files = typedLinks
    .map((item) => {
      const attObj = Array.isArray(item.attachment) ? item.attachment[0] : item.attachment;
      return attObj?.url ? extractStoredFile(attObj.url) : null;
    })
    .filter((file): file is StoredFile => file !== null);

  return {
    attachmentIds: typedLinks.map((item) => item.attachment_id),
    files,
  };
}

/**
 * Best-effort removal of attachment rows and their files. Callers run it only
 * after the FAQ change it belongs to has succeeded, so a failure here at worst
 * leaves an unused file in storage.
 */
async function clearFaqAttachments(supabase: SupabaseClient, info: FaqAttachmentInfo): Promise<void> {
  try {
    const pathsByBucket = new Map<string, string[]>();
    for (const file of info.files) {
      pathsByBucket.set(file.bucket, [...(pathsByBucket.get(file.bucket) ?? []), file.path]);
    }
    for (const [bucket, paths] of pathsByBucket) {
      const { error } = await supabase.storage.from(bucket).remove(paths);
      if (error) throw error;
    }
    if (info.attachmentIds.length > 0) {
      const { error } = await supabase.from("attachment").delete().in("id", info.attachmentIds);
      if (error) throw error;
    }
  } catch (err) {
    console.error("Cleaning up FAQ attachments failed (an unused file may be left in storage):", err);
  }
}

/**
 * Delete an FAQ along with linked attachments and storage files.
 * The FAQ is deleted first, so a failed delete never loses its images.
 */
export async function deleteFaq(id: string): Promise<void> {
  const supabase = createClient();

  // 1. Remember the attachments now: deleting the FAQ cascades faq_attachment away
  const attachments = await getFaqAttachments(supabase, id);

  // 2. Delete the FAQ (faq_tag, faq_attachment and faq_comments cascade).
  //    RLS blocks return no error, just no rows, so check what was deleted.
  const { data: deleted, error } = await supabase
    .from("faqs")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) throw error;
  if (!deleted || deleted.length === 0) {
    throw new Error("This question could not be deleted. You may not have permission to delete it.");
  }

  // 3. Only now remove the files and attachment rows
  await clearFaqAttachments(supabase, attachments);
}

async function uploadFaqImage(
  supabase: SupabaseClient,
  file: File,
  creatorId: string,
): Promise<{ attachmentId: string; stored: StoredFile }> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  const path = `${creatorId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

  const { error: uploadError } = await supabase.storage.from(FAQ_IMAGES_BUCKET).upload(path, file);
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(FAQ_IMAGES_BUCKET).getPublicUrl(path);

  const { data, error } = await supabase
    .from("attachment")
    .insert({ creator_id: creatorId, filename: file.name, filesize: file.size, url: publicUrl })
    .select("id")
    .single();
  if (error) {
    // Don't leave the uploaded file behind without a row pointing to it
    await supabase.storage.from(FAQ_IMAGES_BUCKET).remove([path]);
    throw error;
  }

  return {
    attachmentId: (data as { id: string }).id,
    stored: { bucket: FAQ_IMAGES_BUCKET, path },
  };
}

/**
 * Upload an image and attach it to an FAQ. Used by both the Ask and Edit
 * pages so every FAQ image ends up in the same bucket.
 */
export async function addFaqImage(
  supabase: SupabaseClient,
  faqId: string,
  file: File,
  creatorId: string,
): Promise<void> {
  const uploaded = await uploadFaqImage(supabase, file, creatorId);

  const { error } = await supabase
    .from("faq_attachment")
    .insert({ faq_id: faqId, attachment_id: uploaded.attachmentId });
  if (error) {
    await clearFaqAttachments(supabase, { attachmentIds: [uploaded.attachmentId], files: [uploaded.stored] });
    throw error;
  }
}

export type UpdateFaqInput = {
  question: string;
  description: string;
  tagIds: string[];
  imageFile?: File | null;
  removeImage?: boolean;
};

export async function updateFaq(id: string, input: UpdateFaqInput, editorId: string): Promise<void> {
  const supabase = createClient();

  const { error: updateError } = await supabase
    .from("faqs")
    .update({
      question: input.question,
      description: input.description || undefined,
    })
    .eq("id", id);
  if (updateError) throw updateError;

  // Sync tags: add the new ones first, then drop the removed ones, so a failed
  // insert never leaves the question with no tags.
  const { data: currentTagRows, error: currentTagsError } = await supabase
    .from("faq_tag")
    .select("tag_id")
    .eq("faq_id", id);
  if (currentTagsError) throw currentTagsError;

  const currentTagIds = (currentTagRows ?? []).map((row) => row.tag_id);
  const tagIdsToAdd = input.tagIds.filter((tagId) => !currentTagIds.includes(tagId));
  const tagIdsToRemove = currentTagIds.filter((tagId) => !input.tagIds.includes(tagId));

  if (tagIdsToAdd.length > 0) {
    const { error: insertTagsError } = await supabase
      .from("faq_tag")
      .insert(tagIdsToAdd.map((tagId) => ({ faq_id: id, tag_id: tagId })));
    if (insertTagsError) throw insertTagsError;
  }

  if (tagIdsToRemove.length > 0) {
    const { error: deleteTagsError } = await supabase
      .from("faq_tag")
      .delete()
      .eq("faq_id", id)
      .in("tag_id", tagIdsToRemove);
    if (deleteTagsError) throw deleteTagsError;
  }

  // Image removal or replacement. The new image is added before the old one
  // is removed, so a failed upload keeps the question's current image.
  if (input.removeImage || input.imageFile) {
    const existing = await getFaqAttachments(supabase, id);

    if (input.imageFile) {
      await addFaqImage(supabase, id, input.imageFile, editorId);
    }

    if (existing.attachmentIds.length > 0) {
      const { error: unlinkError } = await supabase
        .from("faq_attachment")
        .delete()
        .eq("faq_id", id)
        .in("attachment_id", existing.attachmentIds);
      if (unlinkError) throw unlinkError;
      await clearFaqAttachments(supabase, existing);
    }
  }
}