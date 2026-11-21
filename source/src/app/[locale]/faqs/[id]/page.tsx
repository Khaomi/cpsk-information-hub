"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useRole } from "@/src/components/role-context";
import { createClient } from "@/src/lib/supabase/client";
import { Faq, fetchFaqById } from "@/src/lib/faqs";
import { colorForTag } from "@/src/lib/tags";
import {
  fetchFaqComments,
  insertFaqComment,
  updateFaqComment,
  deleteFaqComment,
  FaqComment,
} from "@/src/lib/faq_comments";
import {
  ArrowLeft,
  MessageSquare,
  UserCircle,
  Clock,
  Edit3,
  Send,
  Trash2,
} from "lucide-react";

export default function FaqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, isStaff } = useRole();
  const t = useTranslations();

  const [faq, setFaq] = useState<Faq | null>(null);
  const [comments, setComments] = useState<FaqComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  

  // Comment state
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Edit state for Comments
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");

  // Confirm delete
  const [confirming, setConfirming] = useState<{ id: string; type: "delete" | "faq" } | null>(null);
  useEffect(() => {
    async function loadFaqData() {
      setLoading(true);
      setError(null);

      try {
        const [fetchedFaq, fetchedComments] = await Promise.all([
          fetchFaqById(id),
          fetchFaqComments(id),
        ]);

        if (!fetchedFaq || !fetchedFaq.id || !fetchedFaq.question) {
          setError(t("faqs.errors.load") || "Failed to load question details or question does not exist.");
          setLoading(false);
          return;
        }

        setFaq(fetchedFaq);
        setComments(fetchedComments);
      } catch (err: unknown) {
        const errMessage = err instanceof Error ? err.message : "Failed to load question details.";
        setError(errMessage);
      }

      setLoading(false);
    }

    loadFaqData();
  }, [id, t]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStaff) {
      setActionError("Unauthorized: Only staff can reply.");
      return;
    }
    if (canEdit) {
      setActionError("You cannot answer your own question.");
      return;
    }
    if (!newComment.trim() || !user || !faq) return;

    setSubmittingComment(true);
    setActionError(null);

    try {
      const createdComment = await insertFaqComment(faq.id, newComment.trim(), Boolean(isStaff));
      setComments((prev) => [...prev, createdComment]);
      setNewComment("");
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : "Failed to submit comment.";
      setActionError("Failed to submit comment: " + errMessage);
      setSubmittingComment(false);
      return;
    }

    if (faq.status === "UNANSWERED") {
      const newStatus = "ANSWERED";
      const supabase = createClient();
      const { error: statusError } = await supabase
        .from("faqs")
        .update({ status: newStatus })
        .eq("id", faq.id);

      if (statusError) {
        setActionError("Reply posted, but the status could not be changed to ANSWERED: " + statusError.message);
      } else {
        setFaq((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    }

    setSubmittingComment(false);
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editCommentContent.trim()) return;

    setActionError(null);
    try {
      await updateFaqComment(commentId, editCommentContent.trim());
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, content: editCommentContent.trim() } : c))
      );
      setEditingCommentId(null);
      setEditCommentContent("");
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : "Failed to update comment.";
      setActionError("Failed to update comment: " + errMessage);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setActionError(null);
    try {
      await deleteFaqComment(commentId);

      const updatedComments = comments.filter((c) => c.id !== commentId);
      setComments(updatedComments);
      setConfirming(null);

      if (updatedComments.length === 0 && faq && faq.status !== "UNANSWERED") {
        const newStatus = "UNANSWERED";
        const supabase = createClient();

        const { error: updateError } = await supabase
          .from("faqs")
          .update({ status: newStatus })
          .eq("id", faq.id);

        if (!updateError) {
          setFaq((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : "Failed to delete comment.";
      setActionError("Failed to delete comment: " + errMessage);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center text-stone-500">
        {t("common.loading")}
      </div>
    );
  }

  if (error || !faq) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <button
          type="button"
          onClick={() => router.push("/faqs")}
          className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> {t("common.back")}
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error || t("faqs.notFound")}
        </div>
      </div>
    );
  }

  const canEdit = Boolean(user && (faq.creatorId && user.id === faq.creatorId));
  const canReply = Boolean(isStaff && !canEdit);
  const displayName =
    isStaff || faq.authorId === user?.id
      ? `${faq.authorName}`
      : faq.isAnonymous
      ? t("faqs.anonymous")
      : faq.authorName;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/faqs")}
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {t("common.back")}
        </button>

        {canEdit && (
          <Link
            href={`/faqs/${faq.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-md hover:bg-teal-100 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" /> {t("announcements.actions.edit")}
          </Link>
        )}
      </div>

      {actionError && (
        <div className="flex items-start justify-between gap-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs font-medium text-red-700 hover:text-red-900 shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <article className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-stone-100 bg-stone-50/60 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    faq.status === "RESOLVED"
                      ? "bg-emerald-100 text-emerald-800"
                      : faq.status === "ANSWERED"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {faq.status === "RESOLVED"
                    ? t("faqs.statuses.RESOLVED")
                    : faq.status === "ANSWERED"
                    ? t("faqs.statuses.ANSWERED")
                    : t("faqs.statuses.UNANSWERED")}
                </span>

                {faq.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colorForTag(tag)}`}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>

              <h1 className="text-2xl font-bold text-stone-900 leading-snug">
                {faq.question}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4 text-xs text-stone-500">
            <div className="flex items-center gap-1.5">
              <UserCircle className="w-4 h-4 text-stone-400" />
              <span>
                {t("faqs.askedBy", {
                  author: displayName,
                })}
              </span>
            </div>

            {faq.createdAt && (
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-stone-400" />
                <span>{new Date(faq.createdAt).toLocaleDateString()}</span>
              </div>
            )}
          </div>

          {faq.description && (
            <div className="mt-4">
              <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-1">
                {t("form.fields.body")}
              </h3>
              <p className="text-stone-800 text-sm whitespace-pre-wrap">
                {faq.description}
              </p>
            </div>
          )}

          {faq.imageUrl && (
            <div className="mt-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={faq.imageUrl}
                alt={faq.question}
                className="max-h-80 rounded-lg border border-stone-200 object-contain bg-white"
              />
            </div>
          )}
        </div>

        {/* Comments View */}
        <div className="p-6">
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-teal-600" /> {t("faqs.repliesCount", { count: comments.length })}
            </h2>

            {canReply ? (
              <form onSubmit={handleAddComment} className="space-y-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  placeholder={t("faqs.replyPlaceholder")}
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
                    {submittingComment ? t("common.loading") : t("faqs.postReply")}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-center text-xs text-stone-500">
                {isStaff
                  ? t("faqs.cantReplyOwn")
                  : t("faqs.staffOnlyReply")}
              </div>
            )}

            <div className="space-y-4 pt-2 border-t border-stone-100">
              {comments.length === 0 ? (
                <p className="text-xs text-stone-400 text-center py-4">
                  {t("faqs.noReplies")}
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

                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              comment.authorRole === "admin"
                                ? "bg-purple-100 text-purple-800"
                                : comment.authorRole === "lecturer"
                                ? "bg-blue-100 text-blue-800"
                                : comment.authorRole === "ta"
                                ? "bg-teal-100 text-teal-800"
                                : "bg-stone-200 text-stone-700"
                            }`}
                          >
                            {comment.authorRole}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span>{new Date(comment.createdAt).toLocaleDateString()}</span>

                          {isAuthor && !isEditingThisComment && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(comment.id);
                                setEditCommentContent(comment.content);
                              }}
                              className="text-teal-700 hover:text-teal-900 font-medium"
                            >
                              {t("announcements.actions.edit")}
                            </button>
                          )}

                          {canDeleteComment && (
                            <button
                              type="button"
                              onClick={() => setConfirming({ id: comment.id, type: "delete" })}
                              className="text-red-600 hover:text-red-800 font-medium inline-flex items-center gap-1"
                              title={t("faqs.actions.delete")}
                            >
                              <Trash2 className="w-3.5 h-3.5" /> {t("faqs.actions.delete")}
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
                              type="button"
                              onClick={() => handleUpdateComment(comment.id)}
                              className="px-3 py-1 bg-teal-600 text-white rounded text-xs font-semibold hover:bg-teal-700"
                            >
                              {t("tags.actions.save")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCommentId(null)}
                              className="px-3 py-1 bg-stone-200 text-stone-700 rounded text-xs font-semibold hover:bg-stone-300"
                            >
                              {t("common.cancel")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-stone-800 whitespace-pre-wrap">{comment.content}</p>
                      )}

                      {confirming?.id === comment.id && confirming.type === "delete" && (
                        <div className="mt-3 pt-3 border-t border-stone-100 bg-red-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg">
                          <p className="text-xs text-red-700 font-medium mb-2">
                            {t("announcements.confirm.deleteDetail")}
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-xs font-medium bg-red-700 text-white rounded px-3 py-1.5 hover:bg-red-800 transition-colors"
                            >
                              {t("announcements.confirm.yesDelete")}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirming(null)}
                              className="text-xs font-medium border border-stone-300 bg-white rounded px-3 py-1.5 hover:bg-stone-50 transition-colors"
                            >
                              {t("common.cancel")}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}