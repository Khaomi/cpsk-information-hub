import { createClient } from "@/src/lib/supabase/client";
import type { Tables } from "@/types/database.types";

export type FaqComment = {
  id: string;
  faqId: string;
  authorId: string;
  content: string;
  isStaff: boolean;
  createdAt: string;
  authorName: string;
  authorRole: string;
};

type ProfileRow = Tables<"profile">;
type FaqCommentRow = Tables<"faq_comments">;

/**
 * Fetch all comments for a specific FAQ along with resolved author roles and metadata names.
 */
export async function fetchFaqComments(faqId: string): Promise<FaqComment[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: commentsData, error: commentsError } = await supabase
    .from("faq_comments")
    .select("*")
    .eq("faq_id", faqId)
    .order("created_at", { ascending: true });

  if (commentsError) {
    throw new Error(commentsError.message || "Failed to fetch FAQ comments");
  }

  const typedComments = (commentsData as FaqCommentRow[] | null) ?? [];
  if (typedComments.length === 0) {
    return [];
  }

  // Extract unique author IDs and fetch their profiles
  const authorIds = Array.from(new Set(typedComments.map((c) => c.author_id)));
  
  const { data: profilesData, error: profileError } = await supabase
    .from("profile")
    .select("*")
    .in("id", authorIds);

  if (profileError) {
    throw new Error(profileError.message || "Failed to fetch comment author profiles");
  }

  const profileMap = new Map<string, ProfileRow>();
  (profilesData as ProfileRow[] | null)?.forEach((p) => profileMap.set(p.id, p));

  return typedComments.map((c) => {
    const profile = profileMap.get(c.author_id);
    
    // If the comment belongs to the current logged-in user, read their name from auth metadata
    const isCurrentUser = user && user.id === c.author_id;
    const currentUserName = 
      (user?.user_metadata?.full_name as string) || 
      (user?.user_metadata?.name as string) || 
      user?.email?.split("@")[0];

    const authorName = isCurrentUser 
      ? (currentUserName || "User") 
      : (c.is_staff ? "Staff Member" : "Student");

    const authorRole = profile?.role || (c.is_staff ? "staff" : "student");

    return {
      id: c.id,
      faqId: c.faq_id,
      authorId: c.author_id,
      content: c.content,
      isStaff: c.is_staff,
      createdAt: c.created_at ?? new Date().toISOString(),
      authorName,
      authorRole,
    };
  });
}

/**
 * Insert a new reply/comment for an FAQ.
 */
export async function insertFaqComment(faqId: string, content: string, isStaff: boolean): Promise<FaqComment> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to reply.");
  }

  const { data: createdComment, error: commentError } = await supabase
    .from("faq_comments")
    .insert({
      faq_id: faqId,
      author_id: user.id,
      content: content.trim(),
      is_staff: isStaff,
    })
    .select("*")
    .single();

  if (commentError || !createdComment) {
    throw new Error(commentError?.message || "Failed to post comment");
  }

  const typedComment = createdComment as FaqCommentRow;

  // Fetch author profile
  const { data: profileData } = await supabase
    .from("profile")
    .select("*")
    .eq("id", user.id)
    .single();

  const typedProfile = profileData as ProfileRow | null;

  // Get name from current logged-in Google user metadata
  const authorName = 
    (user.user_metadata?.full_name as string) || 
    (user.user_metadata?.name as string) || 
    user.email?.split("@")[0] || 
    "User";

  const authorRole = typedProfile?.role || (isStaff ? "staff" : "student");

  return {
    id: typedComment.id,
    faqId: typedComment.faq_id,
    authorId: typedComment.author_id,
    content: typedComment.content,
    isStaff: typedComment.is_staff,
    createdAt: typedComment.created_at ?? new Date().toISOString(),
    authorName,
    authorRole,
  };
}

/**
 * Update an existing FAQ comment.
 */
export async function updateFaqComment(commentId: string, content: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("faq_comments")
    .update({ content: content.trim() })
    .eq("id", commentId);

  if (error) throw error;
}

/**
 * Delete an FAQ comment by ID.
 */
export async function deleteFaqComment(commentId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("faq_comments")
    .delete()
    .eq("id", commentId);

  if (error) throw error;
}