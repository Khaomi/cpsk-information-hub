"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { insertFaq } from "@/src/lib/faqs";
import { useRole } from "@/src/components/role-context";
import { ShieldAlert } from "lucide-react";

export default function AskFaqPage() {
  const router = useRouter();
  const { user } = useRole();
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = user?.displayName || user?.email || "Student";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await insertFaq({
        question: question.trim(),
        isAnonymous: true,
      });
      router.push("/faqs");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4 text-stone-900">Ask a Question</h1>

      {error && (
        <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Your Question
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            required
            className="w-full p-2 border border-stone-300 rounded-md focus:ring-teal-500 focus:border-teal-500 text-stone-900"
            placeholder="Type your question here..."
          />
        </div>

        {/* Anonymity Notice for Students */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            You are posting as <strong>{displayName}</strong>. Your question will appear <strong>anonymous to other students</strong> on the public board, but course staff and lecturers will still be able to see your identity.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors disabled:opacity-50 font-medium text-sm"
        >
          {submitting ? "Submitting..." : "Submit Question"}
        </button>
      </form>
    </div>
  );
}