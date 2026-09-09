"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { colorForTag, type Tag } from "@/src/lib/tags";
import { toDateTimeInputValue } from "@/src/lib/announcements";

export type AnnouncementFormValues = {
  title: string;
  body: string;
  publishedDate: string;
  expiryDate: string;
  tagIds: string[];
  // A newly picked file to upload, or null if the image is unchanged (or
  // there never was one). removeImage means "drop the existing image" —
  // kept separate from imageFile so "replace" and "clear" are distinguishable.
  imageFile: File | null;
  removeImage: boolean;
};

type FormErrors = Partial<Record<"title" | "body" | "publishedDate" | "tags", string>>;

type AnnouncementFormProps = {
  tags: Tag[];
  initialValues?: AnnouncementFormValues;
  initialImageUrl?: string | null;
  onSubmit: (values: AnnouncementFormValues, status: "draft" | "published") => void;
  onCancel: () => void;
  submitLabel?: string;
};

const EMPTY_VALUES: AnnouncementFormValues = {
  title: "",
  body: "",
  publishedDate: "",
  expiryDate: "",
  tagIds: [],
  imageFile: null,
  removeImage: false,
};

export default function AnnouncementForm({
  tags,
  initialValues = EMPTY_VALUES,
  initialImageUrl = null,
  onSubmit,
  onCancel,
}: AnnouncementFormProps) {
  const [values, setValues] = useState<AnnouncementFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl);
  // Frozen at mount rather than recomputed every render, so the picker's
  // floor doesn't creep past a value the user already selected while typing.
  const [minPublishedDate] = useState<string>(() => toDateTimeInputValue(new Date().toISOString()));

  // Revoke the previous object URL (if any) whenever the preview changes or
  // the form unmounts, so picking several files in a row doesn't leak blobs.
  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const update = <K extends keyof AnnouncementFormValues>(key: K, value: AnnouncementFormValues[K]): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0] ?? null;
    update("imageFile", file);
    update("removeImage", false);
    setImagePreview(file ? URL.createObjectURL(file) : initialImageUrl);
  };

  const handleRemoveImage = (): void => {
    update("imageFile", null);
    update("removeImage", true);
    setImagePreview(null);
  };

  const toggleTag = (tagId: string): void => {
    setValues((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((t) => t !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  // SRS-4 / SRS-5: title and body are always required. A draft has no
  // schedule yet (starts_at/ends_at stay null), so Published Date is only
  // required once the user actually publishes.
  const validateRequiredFields = (status: "draft" | "published"): FormErrors => {
    const next: FormErrors = {};
    if (!values.title.trim()) next.title = "Title is required.";
    if (!values.body.trim()) next.body = "Body is required.";
    if (status === "published" && !values.publishedDate) {
      next.publishedDate = "Published date is required.";
    } else if (
      status === "published" &&
      // Only re-check on an actual change — an already-past date left
      // untouched while editing an old published announcement is fine.
      values.publishedDate !== initialValues.publishedDate &&
      new Date(values.publishedDate).getTime() < Date.now()
    ) {
      next.publishedDate = "You can only publish for now or a future date and time.";
    }
    return next;
  };

  const handleSave = (status: "draft" | "published"): void => {
    const fieldErrors = validateRequiredFields(status);

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

        <div>
          <label htmlFor="image" className="block text-sm font-medium text-stone-700 mb-1">
            Image <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          {imagePreview && (
            <img
              src={imagePreview}
              alt=""
              className="mb-2 max-h-48 rounded-md border border-stone-200 object-cover"
            />
          )}
          <div className="flex items-center gap-3">
            <input
              id="image"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleImageChange}
              className="text-sm text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200"
            />
            {imagePreview && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-sm text-red-600 hover:text-red-800 font-medium"
              >
                Remove
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="publishedDate" className="block text-sm font-medium text-stone-700 mb-1">
              Published Date &amp; Time <span className="text-red-500">*</span>
            </label>
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
