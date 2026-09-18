"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { colorForTag, type Tag } from "@/src/lib/tags";
import { toDateTimeInputValue } from "@/src/lib/announcements";

export type ResourceLinkFormValues = {
  title: string;
  url: string;
  publishedDate: string;
  expiryDate: string;
  tagIds: string[];
};

type FormErrors = Partial<Record<"title" | "url" | "publishedDate" | "tags", string>>;

type ResourceLinkFormProps = {
  tags: Tag[];
  initialValues?: ResourceLinkFormValues;
  onSubmit: (values: ResourceLinkFormValues, status: "draft" | "published") => void;
  onCancel: () => void;
};

const EMPTY_VALUES: ResourceLinkFormValues = {
  title: "",
  url: "",
  publishedDate: "",
  expiryDate: "",
  tagIds: [],
};

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function ResourceLinkForm({
  tags,
  initialValues = EMPTY_VALUES,
  onSubmit,
  onCancel,
}: ResourceLinkFormProps) {
  const [values, setValues] = useState<ResourceLinkFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  // Frozen at mount rather than recomputed every render, so the picker's
  // floor doesn't creep past a value the user already selected while typing.
  const [minPublishedDate] = useState<string>(() => toDateTimeInputValue(new Date().toISOString()));

  const update = <K extends keyof ResourceLinkFormValues>(key: K, value: ResourceLinkFormValues[K]): void => {
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

  // TODO: FIX PUBLISH DATE
  const validateRequiredFields = (values: ResourceLinkFormValues): FormErrors => {
    const next: FormErrors = {};
    if (!values.title.trim()) next.title = "Title is required.";
    if (!values.url.trim()) {
      next.url = "URL is required.";
    } else if (!isValidUrl(values.url.trim())) {
      next.url = "Enter a valid URL, starting with http:// or https://";
    }
    if (
      values.publishedDate &&
      values.publishedDate !== initialValues.publishedDate &&
      new Date(values.publishedDate).getTime() < Date.now()
    ) {
      next.publishedDate = "You can only publish for now or a future date and time.";
    }
    return next;
  };
  
  const handleSave = (status: "draft" | "published"): void => {
    // Blank publish date on Publish defaults to right now (still doesn't work?)
    const effectiveValues: ResourceLinkFormValues =
      status === "published" && !values.publishedDate
        ? { ...values, publishedDate: toDateTimeInputValue(new Date().toISOString()) }
        : values;

    const fieldErrors = validateRequiredFields(effectiveValues);

    // Same rule as announcements.
    if (status === "published" && effectiveValues.tagIds.length === 0) {
      fieldErrors.tags = "Select at least one tag before publishing.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    onSubmit(effectiveValues, status);
  };

  return (
    <div className="max-w-xl">
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

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
          <label htmlFor="url" className="block text-sm font-medium text-stone-700 mb-1">
            URL <span className="text-red-500">*</span>
          </label>
          <input
            id="url"
            type="url"
            placeholder="https://..."
            value={values.url}
            onChange={(e) => update("url", e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              errors.url ? "border-red-400" : "border-stone-300"
            }`}
          />
          {errors.url && <p className="text-xs text-red-600 mt-1">{errors.url}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>

            <input
              id="publishedDate"
              type="datetime-local"
              value={values.publishedDate}
              min={minPublishedDate}
              onChange={(e) => update("publishedDate", e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                errors.publishedDate ? "border-red-400" : "border-stone-300"
              }`}
            />
            {errors.publishedDate && <p className="text-xs text-red-600 mt-1">{errors.publishedDate}</p>}
          </div>

          <div>
            <label htmlFor="expiryDate" className="block text-sm font-medium text-stone-700 mb-1">
              Expiry Date &amp; Time <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <input
              id="expiryDate"
              type="datetime-local"
              value={values.expiryDate}
              min={values.publishedDate || minPublishedDate}
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
            {tags.length === 0 && <p className="text-xs text-stone-400">No tags available yet.</p>}
            {tags.map((tag) => {
              const selected = values.tagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    selected
                      ? "bg-teal-600 border-teal-600 text-white"
                      : `${colorForTag(tag)} border-transparent hover:border-teal-400`
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