"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { colorForTag, type Tag } from "@/src/lib/tags";
import { toDateTimeInputValue } from "@/src/lib/announcements";
import { DepartmentOnlyField } from "@/src/components/department-only";

export type ResourceLinkFormValues = {
  title: string;
  url: string;
  publishedDate: string;
  expiryDate: string;
  tagIds: string[];
  departmentOnly: boolean;
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
  departmentOnly: true,
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
  const t = useTranslations();
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
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  // TODO: FIX PUBLISH DATE
  const validateRequiredFields = (values: ResourceLinkFormValues): FormErrors => {
    const next: FormErrors = {};
    if (!values.title.trim()) next.title = t("form.errors.titleRequired");
    if (!values.url.trim()) {
      next.url = t("form.errors.urlRequired");
    } else if (!isValidUrl(values.url.trim())) {
      next.url = t("form.errors.urlInvalid");
    }
    if (
      values.publishedDate &&
      values.publishedDate !== initialValues.publishedDate &&
      new Date(values.publishedDate).getTime() < Date.now()
    ) {
      next.publishedDate = t("form.errors.publishedDateFuture");
    }
    return next;
  };

  const handleSave = (status: "draft" | "published"): void => {
    // Validate against what the user actually typed — never validate an
    // auto-filled date against itself, since minute-precision rounding
    // can make "right now" look like it's a few seconds in the past.
    const fieldErrors = validateRequiredFields(values);

    // Blank publish date on Publish defaults to right now
    // unscheduled (starts_at/ends_at only get set once actually published).
    const effectiveValues: ResourceLinkFormValues =
      status === "published" && !values.publishedDate
        ? { ...values, publishedDate: toDateTimeInputValue(new Date().toISOString()) }
        : values;

    // Same rule as announcements.
    if (status === "published" && effectiveValues.tagIds.length === 0) {
      fieldErrors.tags = t("validation.selectTagBeforePublish");
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
        {t("common.back")}
      </button>

      <div className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-stone-700 mb-1">
            {t("form.fields.title")} <span className="text-red-500">*</span>
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
            {t("form.fields.url")} <span className="text-red-500">*</span>
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
            <label htmlFor="publishedDate" className="block text-sm font-medium text-stone-700 mb-1">
              {t("form.fields.publishedDate")}{" "}
              <span className="text-stone-400 font-normal">{t("form.fields.publishedDateOptional")}</span>
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
              {t("form.fields.expiryDate")}{" "}
              <span className="text-stone-400 font-normal">{t("form.fields.expiryDateOptional")}</span>
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
            {t("form.fields.targetTags")}{" "}
            <span className="text-stone-400 font-normal">{t("form.fields.targetTagsRequired")}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {tags.length === 0 && <p className="text-xs text-stone-400">{t("form.noTagsAvailable")}</p>}
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