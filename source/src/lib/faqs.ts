import { createClient } from "@/src/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import type { FaqFormValues } from "@/src/components/faq-form";
import type { Tag } from "@/src/lib/tags";

export type FaqStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export type Faq = {
  id: string;
  question: string;
  answer: string;
  status: FaqStatus;
  creatorId: string;
  authorName: string;
  tags: Tag[];
  imageUrl: string | null
  createdAt: string | null;
};

type FaqViewRow = Tables<"faq_with_details">;
type SupabaseClient = ReturnType<typeof createClient>;

const FAQ_IMAGES_BUCKET = "faq-images";

function extractStoragePath(url: string): string | null {
  const marker = `/${FAQ_IMAGES_BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

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

    for (const link of tagLinks ?? []) {
      if (!link.tag) continue;
      const list = tagsByFaq.get(link.faq_id) ?? [];
      list.push(link.tag);
      tagsByFaq.set(link.faq_id, list);
    }

    for (const link of imageLinks ?? []) {
      if (!link.attachment || imageByFaq.has(link.faq_id)) continue;
      imageByFaq.set(link.faq_id, link.attachment.url);
    }
  }

  return rows.map((row) => ({
    id: row.id as string,
    question: row.question ?? "",
    answer: row.answer ?? "",
    status: (row.status ?? "DRAFT") as FaqStatus,
    creatorId: row.creator_id as string,
    authorName: row.author_name ?? "Unknown",
    tags: tagsByFaq.get(row.id as string) ?? [],
    imageUrl: imageByFaq.get(row.id as string) ?? null,
    createdAt: row.created_at ?? null
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

async function uploadFaqImage(supabase: SupabaseClient, file: File, creatorId: string): Promise<string> {
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
  if (error) throw error;

  return data.id as string;
}
// src/lib/faqs.ts

export async function setFaqActive(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("faq")
    .update({ status: "ACTIVE" })
    .eq("id", id);
  if (error) throw error;
}

async function clearFaqImage(supabase: SupabaseClient, faqId: string): Promise<void> {
  const { data: links, error } = await supabase
    .from("faq_attachment")
    .select("attachment_id, attachment:attachment(url)")
    .eq("faq_id", faqId);
  if (error) throw error;
  if (!links || links.length === 0) return;

  const { error: unlinkError } = await supabase
    .from("faq_attachment")
    .delete()
    .eq("faq_id", faqId);
  if (unlinkError) throw unlinkError;

  for (const link of links) {
    const path = link.attachment ? extractStoragePath(link.attachment.url) : null;
    if (path) {
      await supabase.storage.from(FAQ_IMAGES_BUCKET).remove([path]);
    }
    await supabase.from("attachment").delete().eq("id", link.attachment_id);
  }
}

async function syncTags(supabase: SupabaseClient, faqId: string, tagIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from("faq_tag")
    .delete()
    .eq("faq_id", faqId);
  if (deleteError) throw deleteError;

  if (tagIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("faq_tag")
    .insert(tagIds.map((tagId) => ({ faq_id: faqId, tag_id: tagId })));
  if (insertError) throw insertError;
}

export async function fetchFaqs(): Promise<Faq[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("faq_with_details")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    // Wrap Supabase error object into a standard Error
    throw new Error(error.message || "Failed to fetch FAQs");
  }

  return attachRelations(supabase, data ?? []);
}

export async function insertFaq(
  values: FaqFormValues,
  status: "draft" | "published",
  creatorId: string
): Promise<void> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("faq")
    .insert({
      question: values.question,
      answer: values.answer,
      status: status === "published" ? "ACTIVE" : "DRAFT",
      creator_id: creatorId,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message || "Failed to create FAQ");
  }

  // Handle tags mapping...
  if (values.tagIds.length > 0 && data?.id) {
    const tagRows = values.tagIds.map((tagId) => ({
      faq_id: data.id,
      tag_id: tagId,
    }));
    const { error: tagError } = await supabase.from("faq_tag").insert(tagRows);
    if (tagError) {
      throw new Error(tagError.message || "Failed to attach tags");
    }
  }
}

export async function updateFaq(
  id: string,
  values: FaqFormValues,
  status: "draft" | "published",
  editorId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("faq")
    .update({
      question: values.question,
      answer: values.answer,
      status: status === "published" ? "ACTIVE" : "DRAFT",
    })
    .eq("id", id);
  if (error) throw error;

  await syncTags(supabase, id, values.tagIds);

  if (values.removeImage || values.imageFile) {
    await clearFaqImage(supabase, id);
  }

  if (values.imageFile) {
    const attachmentId = await uploadFaqImage(supabase, values.imageFile, editorId);
    const { error: linkError } = await supabase
      .from("faq_attachment")
      .insert({ faq_id: id, attachment_id: attachmentId });
    if (linkError) throw linkError;
  }
}

export async function setFaqArchived(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("faq")
    .update({ status: "ARCHIVED" })
    .eq("id", id);
  if (error) throw error;
}


export async function deleteFaq(id: string): Promise<void> {
  const supabase = createClient();
  await clearFaqImage(supabase, id);
  const { error } = await supabase.from("faq").delete().eq("id", id);
  if (error) throw error;
}

type Unsubscribe = () => void;

export function subscribeToFaqs(onChange: () => void): Unsubscribe {
  const supabase = createClient();
  const channel = supabase
    .channel("faqs-list-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "faq" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "faq_tag" }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToFaq(id: string, onChange: () => void): Unsubscribe {
  const supabase = createClient();
  const channel = supabase
    .channel(`faq-${id}-changes`)
    .on("postgres_changes", { event: "*", schema: "public", table: "faq", filter: `id=eq.${id}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "faq_tag", filter: `faq_id=eq.${id}` }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}