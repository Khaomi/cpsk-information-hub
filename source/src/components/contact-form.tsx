"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { colorForTag, type Tag } from "@/src/lib/tags";
import type { ContactRoleType } from "@/src/lib/contacts";


export type ContactFormValues = {
  name: string;
  roleType: ContactRoleType;
  email: string | null;
  building: string | null;
  room: string | null;
  otherContact: string | null;
  bio: string | null;
  tagIds: string[];
  imageFile: File | null;
  removeImage: boolean;
};

type FormErrors = Partial<Record<"name" | "roleType" | "tags", string>>;

type ContactFormProps = {
  tags: Tag[];
  initialValues?: ContactFormValues;
  initialImageUrl?: string | null;
  onSubmit: (values: ContactFormValues, status: "draft" | "published") => void;
  onCancel: () => void;
  submitLabel?: string;
};

const EMPTY_VALUES: ContactFormValues = {
  name: "",
  roleType: "LECTURER",
  email: "",
  building: "",
  room: "",
  otherContact: "",
  bio: "",
  tagIds: [],
  imageFile: null,
  removeImage: false,
};

export default function ContactForm({
  tags,
  initialValues = EMPTY_VALUES,
  initialImageUrl = null,
  onSubmit,
  onCancel,
}: ContactFormProps) {
  const [values, setValues] = useState<ContactFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [imagePreview, setImagePreview] = useState<string | null>(initialImageUrl);

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const update = <K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]): void => {
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

  const validateRequiredFields = (): FormErrors => {
    const next: FormErrors = {};
    if (!values.name.trim()) next.name = "Name is required.";
    return next;
  };

  const handleSave = (status: "draft" | "published"): void => {
    const fieldErrors = validateRequiredFields();

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
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              errors.name ? "border-red-400" : "border-stone-300"
            }`}
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
        </div>

        {/* Role Type */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Role Type <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="radio"
                name="roleType"
                value="LECTURER"
                checked={values.roleType === "LECTURER"}
                onChange={() => update("roleType", "LECTURER")}
                className="text-teal-600 focus:ring-teal-500"
              />
              Lecturer
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="radio"
                name="roleType"
                value="TA"
                checked={values.roleType === "TA"}
                onChange={() => update("roleType", "TA")}
                className="text-teal-600 focus:ring-teal-500"
              />
              TA
            </label>
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <label htmlFor="image" className="block text-sm font-medium text-stone-700 mb-1">
            Profile Photo <span className="text-stone-400 font-normal">(optional)</span>
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

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
            Email <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          <input
            id="email"
            type="email"
            value={values.email ?? ""}
            onChange={(e) => update("email", e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Conditional Role Fields */}
        {values.roleType === "LECTURER" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="building" className="block text-sm font-medium text-stone-700 mb-1">
                Building <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                id="building"
                type="text"
                value={values.building ?? ""}
                onChange={(e) => update("building", e.target.value)}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label htmlFor="room" className="block text-sm font-medium text-stone-700 mb-1">
                Room <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                id="room"
                type="text"
                value={values.room ?? ""}
                onChange={(e) => update("room", e.target.value)}
                className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="otherContact" className="block text-sm font-medium text-stone-700 mb-1">
              Other Contact Method <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <input
              id="otherContact"
              type="text"
              placeholder="e.g. Discord, Teams, LINE"
              value={values.otherContact ?? ""}
              onChange={(e) => update("otherContact", e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        )}

        {/* Bio / Info */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-stone-700 mb-1">
            Bio / Notes <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="bio"
            rows={4}
            value={values.bio ?? ""}
            onChange={(e) => update("bio", e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Tags Selection */}
        <fieldset>
          <legend className="block text-sm font-medium text-stone-700 mb-1">
            Course Tags <span className="text-stone-400 font-normal">(required to publish)</span>
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

        {/* Form Actions */}
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