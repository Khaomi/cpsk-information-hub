"use client";

import { useState } from "react";
import { TAGS } from "@/src/lib/tags";

export type AnnouncementFormValues = {
  title: string;
  body: string;
  publishedDate: string;
  expiryDate: string;
  tagIds: string[];
};

type FormErrors = Partial<Record<"title" | "body" | "publishedDate" | "tags", string>>;

type AnnouncementFormProps = {
  initialValues?: AnnouncementFormValues;
  onSubmit: (values: AnnouncementFormValues, status: "draft" | "published") => void;
  submitLabel?: string;
};

const EMPTY_VALUES: AnnouncementFormValues = {
  title: "",
  body: "",
  publishedDate: "",
  expiryDate: "",
  tagIds: [],
};

export default function AnnouncementForm({
  initialValues = EMPTY_VALUES,
  onSubmit,
}: AnnouncementFormProps) {
  const [values, setValues] = useState<AnnouncementFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});

  const update = <K extends keyof AnnouncementFormValues>(key: K, value: AnnouncementFormValues[K]): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleTag = (tagId: string): void => {
    setValues((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((t) => t !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  // SRS-4 / SRS-5: required fields must be present before saving at all
  const validateRequiredFields = (): FormErrors => {
    const next: FormErrors = {};
    if (!values.title.trim()) next.title = "Title is required.";
    if (!values.body.trim()) next.body = "Body is required.";
    if (!values.publishedDate) next.publishedDate = "Published date is required.";
    return next;
  };

  const handleSave = (status: "draft" | "published"): void => {
    const fieldErrors = validateRequiredFields();

    // SRS-9: publishing specifically requires at least one tag; drafts don't
    if (status === "published" && values.tagIds.length === 0) {
      fieldErrors.tags = "Select at least one tag before publishing.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    onSubmit(values, status);
  };

  return (
    <div className="max-w-xl">
      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-stone-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            value={values.title}
            onChange={(e) => update("title", e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              errors.title ? "border-red-400" : "border-stone-300"
            }`}
          />
          {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
        </div>

        <div>
          <label htmlFor="body" className="block text-sm font-medium text-stone-700 mb-1">
            Body <span className="text-red-500">*</span>
          </label>
          <textarea
            id="body"
            rows={5}
            value={values.body}
            onChange={(e) => update("body", e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              errors.body ? "border-red-400" : "border-stone-300"
            }`}
          />
          {errors.body && <p className="text-xs text-red-600 mt-1">{errors.body}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="publishedDate" className="block text-sm font-medium text-stone-700 mb-1">
              Published Date <span className="text-red-500">*</span>
            </label>
            <input
              id="publishedDate"
              type="date"
              value={values.publishedDate}
              onChange={(e) => update("publishedDate", e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                errors.publishedDate ? "border-red-400" : "border-stone-300"
              }`}
            />
            {errors.publishedDate && <p className="text-xs text-red-600 mt-1">{errors.publishedDate}</p>}
          </div>

          <div>
            <label htmlFor="expiryDate" className="block text-sm font-medium text-stone-700 mb-1">
              Expiry Date <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <input
              id="expiryDate"
              type="date"
              value={values.expiryDate}
              onChange={(e) => update("expiryDate", e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-stone-700 mb-1">
            Target Tags <span className="text-stone-400 font-normal">(required to publish)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => {
              const selected = values.tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    selected
                      ? "bg-teal-600 border-teal-600 text-white"
                      : "bg-white border-stone-300 text-stone-700 hover:border-teal-400"
                  }`}
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
          {errors.tags && <p className="text-xs text-red-600 mt-1">{errors.tags}</p>}
        </fieldset>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleSave("published")}
            className="rounded-md bg-teal-600 text-white text-sm font-medium px-4 py-2 hover:bg-teal-700 transition-colors"
          >
            Publish
          </button>
          <button
            type="button"
            onClick={() => handleSave("draft")}
            className="rounded-md border border-stone-300 text-stone-700 text-sm font-medium px-4 py-2 hover:bg-stone-50 transition-colors"
          >
            Save as Draft
          </button>
        </div>
      </div>
    </div>
  );
}
