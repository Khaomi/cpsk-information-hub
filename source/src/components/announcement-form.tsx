"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import type { Tag } from "@/src/lib/tags";
import { toDateTimeInputValue } from "@/src/lib/announcements";
import { DepartmentOnlyField } from "@/src/components/department-only";
import { FormField, inputClass } from "@/src/components/form-field";
import { TagPicker } from "@/src/components/tag-picker";

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
  departmentOnly: boolean;
};

type SaveStatus = "draft" | "published";

type FormErrors = Partial<Record<"title" | "body" | "publishedDate" | "tags", string>>;

type AnnouncementFormProps = {
  tags: Tag[];
  initialValues?: AnnouncementFormValues;
  initialImageUrl?: string | null;
  onSubmit: (values: AnnouncementFormValues, status: SaveStatus) => void;
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
  departmentOnly: true,
};

// SRS-4 / SRS-5: title and body are always required. Published Date is
// optional — leaving it blank while publishing means "publish now" (see
// computeDates), so it only needs validating when the user did type one.
// SRS-9: publishing specifically requires at least one tag; drafts don't.
export function validateAnnouncementForm(
  values: AnnouncementFormValues,
  status: SaveStatus,
  initialPublishedDate: string,
  t: (key: string) => string,
): FormErrors {
  const errors: FormErrors = {};
  if (!values.title.trim()) errors.title = t("form.errors.titleRequired");
  if (!values.body.trim()) errors.body = t("form.errors.bodyRequired");
  if (status === "published" && isNewPastDate(values.publishedDate, initialPublishedDate)) {
    errors.publishedDate = t("form.errors.publishedDateFuture");
  }
  if (status === "published" && values.tagIds.length === 0) {
    errors.tags = t("validation.selectTagBeforePublish");
  }
  return errors;
}

// Only re-check on an actual change — an already-past date left untouched
// while editing an old published announcement is fine.
function isNewPastDate(date: string, initialDate: string): boolean {
  return Boolean(date) && date !== initialDate && new Date(date).getTime() < Date.now();
}

export default function AnnouncementForm({
  tags,
  initialValues = EMPTY_VALUES,
  initialImageUrl = null,
  onSubmit,
  onCancel,
}: AnnouncementFormProps) {
  const t = useTranslations();
  const [values, setValues] = useState<AnnouncementFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  // Frozen at mount rather than recomputed every render, so the picker's
  // floor doesn't creep past a value the user already selected while typing.
  const [minPublishedDate] = useState<string>(() => toDateTimeInputValue(new Date().toISOString()));

  const update = <K extends keyof AnnouncementFormValues>(key: K, value: AnnouncementFormValues[K]): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = (status: SaveStatus): void => {
    const fieldErrors = validateAnnouncementForm(values, status, initialValues.publishedDate, t);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length === 0) onSubmit(values, status);
  };

  return (
    <div className="max-w-xl">
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("common.back")}
      </button>

      <div className="space-y-4">
        <FormField id="title" label={t("form.fields.title")} required error={errors.title}>
          <input
            id="title"
            type="text"
            value={values.title}
            onChange={(e) => update("title", e.target.value)}
            className={inputClass(Boolean(errors.title))}
          />
        </FormField>

        <FormField id="body" label={t("form.fields.body")} required error={errors.body}>
          <textarea
            id="body"
            rows={5}
            value={values.body}
            onChange={(e) => update("body", e.target.value)}
            className={inputClass(Boolean(errors.body))}
          />
        </FormField>

        <AnnouncementImageField
          initialImageUrl={initialImageUrl}
          onPick={(file) => setValues((prev) => ({ ...prev, imageFile: file, removeImage: false }))}
          onRemove={() => setValues((prev) => ({ ...prev, imageFile: null, removeImage: true }))}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            id="publishedDate"
            label={t("form.fields.publishedDate")}
            hint={t("form.fields.publishedDateOptional")}
            error={errors.publishedDate}
          >
            <input
              id="publishedDate"
              type="datetime-local"
              value={values.publishedDate}
              min={minPublishedDate}
              onChange={(e) => update("publishedDate", e.target.value)}
              className={inputClass(Boolean(errors.publishedDate))}
            />
          </FormField>

          <FormField id="expiryDate" label={t("form.fields.expiryDate")} hint={t("form.fields.expiryDateOptional")}>
            <input
              id="expiryDate"
              type="datetime-local"
              value={values.expiryDate}
              min={values.publishedDate || minPublishedDate}
              onChange={(e) => update("expiryDate", e.target.value)}
              className={inputClass(false)}
            />
          </FormField>
        </div>

        <TagPicker
          legend={t("form.fields.targetTags")}
          hint={t("form.fields.targetTagsRequired")}
          tags={tags}
          selectedIds={values.tagIds}
          onChange={(ids) => update("tagIds", ids)}
          emptyLabel={t("form.noTagsAvailable")}
          error={errors.tags}
        />

        <DepartmentOnlyField
          checked={values.departmentOnly}
          onChange={(checked) => update("departmentOnly", checked)}
        />

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleSave("published")}
            className="rounded-md bg-teal-600 text-white text-sm font-medium px-4 py-2 hover:bg-teal-700 transition-colors"
          >
            {t("form.actions.publish")}
          </button>
          <button
            type="button"
            onClick={() => handleSave("draft")}
            className="rounded-md border border-stone-300 text-stone-700 text-sm font-medium px-4 py-2 hover:bg-stone-50 transition-colors"
          >
            {t("form.actions.saveAsDraft")}
          </button>
        </div>
      </div>
    </div>
  );
}

type AnnouncementImageFieldProps = {
  initialImageUrl: string | null;
  onPick: (file: File | null) => void;
  onRemove: () => void;
};

// Optional image: shows a preview of the current or newly picked file, with
// a Remove button. Owns the preview URL so the form only tracks the file.
function AnnouncementImageField({ initialImageUrl, onPick, onRemove }: AnnouncementImageFieldProps) {
  const t = useTranslations();
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl);

  // Revoke the previous object URL (if any) whenever the preview changes or
  // the form unmounts, so picking several files in a row doesn't leak blobs.
  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0] ?? null;
    onPick(file);
    setImagePreview(file ? URL.createObjectURL(file) : initialImageUrl);
  };

  const handleRemove = (): void => {
    onRemove();
    setImagePreview(null);
  };

  return (
    <FormField id="image" label={t("form.fields.image")} hint={t("form.fields.imageOptional")}>
      {imagePreview && (
        <div className="mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt="" className="mb-2 max-h-48 rounded-md border border-stone-200 object-cover" />
        </div>
      )}
      <div className="flex items-center gap-3">
        <input
          id="image"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleChange}
          className="text-sm text-stone-600 file:mr-3 file:rounded-md file:border-0 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200"
        />
        {imagePreview && (
          <button type="button" onClick={handleRemove} className="text-sm text-red-600 hover:text-red-800 font-medium">
            {t("form.actions.remove")}
          </button>
        )}
      </div>
    </FormField>
  );
}
