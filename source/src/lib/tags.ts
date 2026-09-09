import { createClient } from "@/src/lib/supabase/client";

// Matches the public.tag table
export type Tag = {
  id: string;
  name: string;
  category: "year" | "course" | "activity" | null;
};

export const CATEGORY_COLORS: Record<string, string> = {
  year: "bg-yellow-200 text-yellow-900",
  course: "bg-teal-200 text-teal-900",
  activity: "bg-purple-200 text-purple-900",
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
