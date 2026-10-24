"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/src/components/role-context";
import { createClient } from "@/src/lib/supabase/client";
import { 
  fetchFaqComments, 
  insertFaqComment, 
  updateFaqComment, 
  deleteFaqComment, 
  FaqComment 
} from "@/src/lib/faq_comments";
import { 
  ArrowLeft, 
  MessageSquare, 
  UserCircle, 
  Clock, 
  Edit3, 
  Send,
  Lock,
  Trash2
} from "lucide-react";

interface FaqDetail {
  id: string;
  question: string;
  answer: string | null;
  status: "UNANSWERED" | "ANSWERED" | "RESOLVED";
  is_anonymous: boolean;
  creator_id: string | null;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_email?: string;
}

export default function FaqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isStaff } = useRole();

  const [faq, setFaq] = useState<FaqDetail | null>(null);
  const [comments, setComments] = useState<FaqComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit states for FAQ
  const [isEditing, setIsEditing] = useState(false);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [editStatus, setEditStatus] = useState<FaqDetail["status"]>("UNANSWERED");
  const [saving, setSaving] = useState(false);

  // Comment state
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Edit state for Comments
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");

  useEffect(() => {
    async function loadFaqData() {
      const supabase = createClient();
      setLoading(true);

      const { data: faqData, error: faqError } = await supabase
        .from("faq_with_details")
        .select("*")
        .eq("id", id)
        .single();

      if (faqError || !faqData || !faqData.id || !faqData.question) {
        setError("Failed to load question details or question does not exist.");
        setLoading(false);
        return;
      }

      const formattedFaq: FaqDetail = {
        id: faqData.id,
        question: faqData.question,
        answer: faqData.answer ?? null,
        status: (faqData.status as FaqDetail["status"]) ?? "UNANSWERED",
        is_anonymous: faqData.is_anonymous ?? false,
        creator_id: faqData.creator_id ?? null,
        created_at: faqData.created_at ?? new Date().toISOString(),
        updated_at: faqData.updated_at ?? new Date().toISOString(),
        author_name: faqData.author_name ?? undefined,  
        author_email: faqData.author_email ?? undefined, 
      };

      setFaq(formattedFaq);
      setEditQuestion(formattedFaq.question);
      setEditAnswer(formattedFaq.answer ?? "");
      setEditStatus(formattedFaq.status);

      try {
        const fetchedComments = await fetchFaqComments(id);
        setComments(fetchedComments);
      } catch (err: any) {
        setError(err.message || "Failed to load comments.");
      }

      setLoading(false);
    }

    loadFaqData();
  }, [id]);

  const handleUpdateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faq) return;

    setSaving(true);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("faqs")
      .update({
        question: editQuestion.trim(),
        answer: editAnswer.trim() || null,
        status: editStatus,
        answered_by_id: editAnswer.trim() ? user?.id : faq.creator_id,
      })
      .eq("id", faq.id);

    if (updateError) {
      setError("Failed to update question: " + updateError.message);
    } else {
      setFaq((prev) =>
        prev
          ? {
              ...prev,
              question: editQuestion,
              answer: editAnswer || null,
              status: editStatus,
            }
          : null
      );
      setIsEditing(false);
    }
    setSaving(false);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStaff) {
      setError("Unauthorized: Only staff can reply.");
      return;
    }
    if (!newComment.trim() || !user || !faq) return;

    setSubmittingComment(true);

    try {
      const createdComment = await insertFaqComment(faq.id, newComment.trim(), Boolean(isStaff));
      setComments((prev) => [...prev, createdComment]);
      setNewComment("");

      // Automatically change status from UNANSWERED to ANSWERED if not resolved
      if (faq.status === "UNANSWERED") {
        const newStatus = "ANSWERED";
        const supabase = createClient();
        await supabase
          .from("faqs")
          .update({ status: newStatus })
          .eq("id", faq.id);

        setFaq((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: any) {
      setError("Failed to submit comment: " + err.message);
    }

    setSubmittingComment(false);
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return;

    try {
      await updateFaqComment(commentId, editCommentContent.trim());
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content: editCommentContent.trim() } : c))
      );
      setEditingCommentId(null);
      setEditCommentContent("");
    } catch (err: any) {
      setError("Failed to update comment: " + err.message);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this reply?")) return;

    try {
      await deleteFaqComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err: any) {
      setError("Failed to delete comment: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center text-stone-500">
        Loading question details...
      </div>
    );
  }

  if (error || !faq) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => router.push("/faqs")}
          className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to FAQs
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error || "Question not found."}
        </div>
      </div>
    );
  }

  const canEdit = isStaff || (user && user.id === faq.creator_id);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/faqs")}
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Questions
        </button>

        {canEdit && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" /> Edit Details
          </button>
        )}
      </div>

      {/* Main Announcement Card */}
      <article className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
        {/* Banner Header */}
        <div className="border-b border-stone-100 bg-stone-50/60 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    faq.status === "RESOLVED"
                      ? "bg-emerald-100 text-emerald-800"
                      : faq.status === "ANSWERED"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {faq.status}
                </span>

                {faq.is_anonymous && (
                  <span className="flex items-center gap-1 text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                    <Lock className="w-3 h-3" /> Anonymous to students
                  </span>
                )}
              </div>

              {!isEditing ? (
                <h1 className="text-2xl font-bold text-stone-900 leading-snug">
                  {faq.question}
                </h1>
              ) : null}
            </div>
          </div>

          {/* Author Metadata */}
          <div className="flex items-center gap-4 mt-4 text-xs text-stone-500">
            <div className="flex items-center gap-1.5">
              <UserCircle className="w-4 h-4 text-stone-400" />
              <span>
                Posted by:{" "}
                <strong className="text-stone-700">
                  {!isStaff ? "Anonymous" : faq.author_name || "Student"}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span>{new Date(faq.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Edit Form OR Body View */}
        <div className="p-6">
          {isEditing ? (
            <form onSubmit={handleUpdateFaq} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Question Title
                </label>
                <input
                  type="text"
                  value={editQuestion}
                  onChange={(e) => setEditQuestion(e.target.value)}
                  required
                  className="w-full p-2 border border-stone-300 rounded-md text-sm text-stone-900 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              {isStaff && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Official Answer / Response
                  </label>
                  <textarea
                    value={editAnswer}
                    onChange={(e) => setEditAnswer(e.target.value)}
                    rows={5}
                    placeholder="Provide an official staff response..."
                    className="w-full p-2 border border-stone-300 rounded-md text-sm text-stone-900 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as FaqDetail["status"])}
                  className="p-2 border border-stone-300 rounded-md text-sm text-stone-900 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="UNANSWERED">UNANSWERED</option>
                  <option value="ANSWERED">ANSWERED</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors text-xs font-semibold disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 rounded-md hover:bg-stone-200 transition-colors text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-teal-600" /> Replies ({comments.length})
              </h2>

              {/* Reply Form - Restricted to Staff */}
              {isStaff ? (
                <form onSubmit={handleAddComment} className="space-y-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    placeholder="Write an official staff response or reply..."
                    required
                    className="w-full p-3 border border-stone-300 rounded-lg text-sm text-stone-900 focus:ring-teal-500 focus:border-teal-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors text-xs font-semibold disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submittingComment ? "Posting..." : "Post Reply"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-center text-xs text-stone-500">
                  Only staff members can post replies to questions.
                </div>
              )}

              {/* Comments Feed */}
              <div className="space-y-4 pt-2 border-t border-stone-100">
                {comments.length === 0 ? (
                  <p className="text-xs text-stone-400 text-center py-4">
                    No replies yet.
                  </p>
                ) : (
                  comments.map((comment) => {
                    const isAuthor = user && user.id === comment.authorId;
                    const canDeleteComment = isStaff || isAuthor;
                    const isEditingThisComment = editingCommentId === comment.id;

                    return (
                      <div
                        key={comment.id}
                        className={`p-4 rounded-lg border text-sm space-y-2.5 ${
                          comment.isStaff
                            ? "bg-teal-50/30 border-teal-200"
                            : "bg-stone-50 border-stone-200"
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs text-stone-500">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-stone-900">
                              {comment.authorName}
                            </span>
                            
                            {/* Role Badge */}
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              comment.authorRole === "admin" 
                                ? "bg-purple-100 text-purple-800"
                                : comment.authorRole === "lecturer"
                                ? "bg-blue-100 text-blue-800"
                                : comment.authorRole === "ta"
                                ? "bg-teal-100 text-teal-800"
                                : "bg-stone-200 text-stone-700"
                            }`}>
                              {comment.authorRole}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                            
                            {isAuthor && !isEditingThisComment && (
                              <button
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditCommentContent(comment.content);
                                }}
                                className="text-teal-700 hover:text-teal-900 font-medium"
                              >
                                Edit
                              </button>
                            )}

                            {canDeleteComment && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-red-600 hover:text-red-800 font-medium inline-flex items-center gap-1"
                                title="Delete Reply"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            )}
                          </div>
                        </div>

                        {isEditingThisComment ? (
                          <div className="space-y-2">
                            <textarea
                              value={editCommentContent}
                              onChange={(e) => setEditCommentContent(e.target.value)}
                              rows={2}
                              className="w-full p-2 border border-stone-300 rounded-md text-sm text-stone-900 bg-white"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateComment(comment.id)}
                                className="px-3 py-1 bg-teal-600 text-white rounded text-xs font-semibold hover:bg-teal-700"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingCommentId(null)}
                                className="px-3 py-1 bg-stone-200 text-stone-700 rounded text-xs font-semibold hover:bg-stone-300"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-stone-800 whitespace-pre-wrap">{comment.content}</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}