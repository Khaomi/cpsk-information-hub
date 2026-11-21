import { createClient } from "@/src/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type TagCategory = Database["public"]["Enums"]["tag_category"];

export type Tag = {
  id: string;
  name: string;
  category: TagCategory | null;
};

export const CATEGORY_COLORS: Record<TagCategory, string> = {
  year: "bg-yellow-200 text-yellow-900",
  course: "bg-teal-200 text-teal-900",
  activity: "bg-purple-200 text-purple-900",
  major: "bg-blue-200 text-blue-900",
};

export const DEFAULT_TAG_COLOR = "bg-stone-200 text-stone-700";

export function colorForTag(tag: Tag): string {
  return (tag.category && CATEGORY_COLORS[tag.category]) || DEFAULT_TAG_COLOR;
}

export async function fetchTags(): Promise<Tag[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("tag").select("id, name, category").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function createTag(name: string, category: TagCategory | null, creatorId: string): Promise<Tag> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tag")
    .insert({ name, category, creator_id: creatorId })
    .select("id, name, category")
    .single();
  if (error) throw error;
  return data;
}

export async function updateTag(id: string, name: string, category: TagCategory | null): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tag").update({ name, category }).eq("id", id);
  if (error) throw error;
}

export async function deleteTag(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("tag").delete().eq("id", id);
  if (error) throw error;
}

type Unsubscribe = () => void;

// The browser Supabase client is shared, and .channel(name) hands back the
// existing channel when the name is already in use. Several components can
// listen to tags at once (e.g. the filter sidebar and the phone drawer), so
// each subscription needs its own channel name, or the second one fails with
// "cannot add postgres_changes callbacks ... after subscribe()".
let tagChannelCount = 0;

export function subscribeToTags(onChange: () => void): Unsubscribe {
  const supabase = createClient();
  tagChannelCount += 1;
  const channel = supabase
    .channel(`tags-list-changes-${tagChannelCount}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "tag" }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
