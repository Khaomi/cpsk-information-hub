import { createClient } from "@/src/lib/supabase/client";
import type { Database, Tables } from "@/types/database.types";
import type { FaqFormValues } from "@/src/components/faq-form";
import type { Tag } from "@/src/lib/tags";
// Your file (e.g., page.ts or api.ts)


export type FaqStatus = Database["public"]["Enums"]["faq_status"];

export type Faq = {
  id: string;
  question: string;
  answer: string | null;
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
      list.push(link.tag as Tag);
      tagsByFaq.set(link.faq_id, list);
    }

    for (const link of imageLinks ?? []) {
      if (!link.attachment || imageByFaq.has(link.faq_id)) continue;
      imageByFaq.set(link.faq_id, link.attachment.url);
    }
  }

  return rows.map((row) => ({
    id: row.id ?? "",
    question: row.question ?? "",
    answer: row.answer ?? null,
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
    .update({ status: isResolved ? "RESOLVED" : "UNANSWERED" })
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
