"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  getCurrentMoment,
  getTodayKey,
  isValidDateKey,
  startsInPast,
  type ScheduleEvent,
  type ScheduleEventInput,
} from "@/src/lib/schedules";
import type { Tag } from "@/src/lib/tags";
import { DepartmentOnlyField } from "@/src/components/department-only";
import { FormField, inputClass } from "@/src/components/form-field";
import { TagPicker } from "@/src/components/tag-picker";

// Every field is a plain string while editing; empty optional fields become
// null only when submitted (see toInput).
export type ScheduleFormValues = {
  title: string;
  date: string; // "YYYY-MM-DD" from <input type="date">, a local date
  startTime: string; // "HH:MM" from <input type="time">
  endTime: string;
  location: string;
  description: string;
  tagIds: string[]; // optional: an event may have no tags
  departmentOnly: boolean;
};

type FormErrors = Partial<Record<"title" | "date" | "startTime" | "endTime" | "location", string>>;

type ScheduleFormModalProps = {
  mode: "create" | "edit";
  initialValues: ScheduleFormValues;
  tags: Tag[]; // every tag the user can pick from
  onSubmit: (values: ScheduleEventInput) => Promise<void>;
  onCancel: () => void;
};

export function emptyScheduleFormValues(date: string): ScheduleFormValues {
  return {
    title: "",
    date,
    startTime: "",
    endTime: "",
    location: "",
    description: "",
    tagIds: [],
    departmentOnly: true,
  };
}

export function scheduleFormValuesFrom(event: ScheduleEvent): ScheduleFormValues {
  return {
    title: event.title,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
    description: event.description ?? "",
    tagIds: event.tags.map((tag) => tag.id),
    departmentOnly: event.departmentOnly,
  };
}

// savedValues: what the event had before editing, or null for a new event
function validate(values: ScheduleFormValues, savedValues: ScheduleFormValues | null): FormErrors {
  const next: FormErrors = {};
  if (!values.title.trim()) next.title = "Event name is required.";
  if (!values.date) next.date = "Date is required.";
  else if (!isValidDateKey(values.date)) next.date = "Enter a valid date.";
  if (!values.startTime) next.startTime = "Start time is required.";
  if (!values.endTime) next.endTime = "End time is required.";
  // "HH:MM" strings compare correctly as text
  else if (values.startTime && values.endTime <= values.startTime) {
    next.endTime = "End time must be after the start time.";
  }
  if (!values.location.trim()) next.location = "Location is required.";
  if (!next.date && !next.startTime) {
    Object.assign(next, pastStartError(values, savedValues));
  }
  return next;
}

// Same rule as the announcement's Published Date: an event can't be set to
// start in the past. A new event is always checked (its date is pre-filled
// from the selected day, which may be in the past). An existing event is only
// re-checked when its date or start time actually changed, so one that
// already happened can still be edited (e.g. to fix a typo) without moving it.
function pastStartError(values: ScheduleFormValues, savedValues: ScheduleFormValues | null): FormErrors {
  const changed =
    !savedValues || values.date !== savedValues.date || values.startTime !== savedValues.startTime;
  const now = getCurrentMoment();
  if (!changed || !startsInPast(values.date, values.startTime, now)) return {};
  return values.date < now.dateKey
    ? { date: "Date can't be in the past." }
    : { startTime: "Start time has already passed." };
}

function toInput(values: ScheduleFormValues): ScheduleEventInput {
  return {
    title: values.title.trim(),
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime,
    location: values.location.trim(),
    description: values.description.trim() || null,
    tagIds: values.tagIds,
    departmentOnly: values.departmentOnly,
  };
}

// Closes the modal when Escape is pressed anywhere on the page
function useEscapeKey(onEscape: () => void): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onEscape();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onEscape]);
}

export default function ScheduleFormModal({ mode, initialValues, tags, onSubmit, onCancel }: ScheduleFormModalProps) {
  const [values, setValues] = useState<ScheduleFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  // Frozen at mount (like the announcement form) so the picker's floor
  // doesn't move while the modal is open
  const [minDate] = useState<string>(() => getTodayKey());

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEscapeKey(onCancel);

  const update = <K extends keyof ScheduleFormValues>(key: K, value: ScheduleFormValues[K]): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Clear that field's message as soon as the user starts fixing it
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key as keyof FormErrors];
      return next;
    });
  };

  // value, change handler and error styling for a field that can fail validation
  const bind = (key: keyof FormErrors) => ({
    value: values[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => update(key, e.target.value),
    "aria-invalid": Boolean(errors[key]),
    className: inputClass(Boolean(errors[key])),
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const fieldErrors = validate(values, mode === "edit" ? initialValues : null);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setSaving(true);
    try {
      await onSubmit(toInput(values));
    } catch {
      setSubmitError("Could not save the event. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const heading = mode === "create" ? "Add event" : "Edit event";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-form-heading"
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200">
          <h2 id="schedule-form-heading" className="font-semibold">
            {heading}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-stone-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form noValidate onSubmit={handleSubmit} className="p-4 space-y-4">
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <FormField id="schedule-title" label="Event name" required error={errors.title}>
            <input
              id="schedule-title"
              ref={titleRef}
              type="text"
              {...bind("title")}
            />
          </FormField>

          <FormField id="schedule-date" label="Date" required error={errors.date}>
            <input id="schedule-date" type="date" min={minDate} {...bind("date")} />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField id="schedule-start" label="Start time" required error={errors.startTime}>
              <input id="schedule-start" type="time" {...bind("startTime")} />
            </FormField>

            <FormField id="schedule-end" label="End time" required error={errors.endTime}>
              <input id="schedule-end" type="time" {...bind("endTime")} />
            </FormField>
          </div>

          <FormField id="schedule-location" label="Location" required error={errors.location}>
            <input id="schedule-location" type="text" {...bind("location")} />
          </FormField>

          <FormField id="schedule-description" label="Description" hint="(optional)">
            <textarea
              id="schedule-description"
              rows={3}
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
              className={inputClass(false)}
            />
          </FormField>

          <TagPicker
            legend="Tags"
            hint="(optional)"
            tags={tags}
            selectedIds={values.tagIds}
            onChange={(ids) => update("tagIds", ids)}
            emptyLabel="No tags available."
          />

          <DepartmentOnlyField
            checked={values.departmentOnly}
            onChange={(checked) => update("departmentOnly", checked)}
          />

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-teal-600 text-white text-sm font-medium px-4 py-2 hover:bg-teal-700 transition-colors disabled:opacity-60"
            >
              {mode === "create" ? "Add event" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="rounded-md border border-stone-300 text-stone-700 text-sm font-medium px-4 py-2 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
