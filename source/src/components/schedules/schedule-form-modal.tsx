"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { isValidDateKey, type ScheduleEvent, type ScheduleEventInput } from "@/src/lib/schedules";

// Every field is a plain string while editing; empty optional fields become
// null only when submitted (see toInput).
export type ScheduleFormValues = {
  title: string;
  date: string; // "YYYY-MM-DD" from <input type="date">, a local date
  startTime: string; // "HH:MM" from <input type="time">
  endTime: string;
  location: string;
  description: string;
};

type FormErrors = Partial<Record<"title" | "date" | "startTime" | "endTime" | "location", string>>;

type ScheduleFormModalProps = {
  mode: "create" | "edit";
  initialValues: ScheduleFormValues;
  onSubmit: (values: ScheduleEventInput) => Promise<void>;
  onCancel: () => void;
};

export function emptyScheduleFormValues(date: string): ScheduleFormValues {
  return { title: "", date, startTime: "", endTime: "", location: "", description: "" };
}

export function scheduleFormValuesFrom(event: ScheduleEvent): ScheduleFormValues {
  return {
    title: event.title,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime ?? "",
    location: event.location,
    description: event.description ?? "",
  };
}

function validate(values: ScheduleFormValues): FormErrors {
  const next: FormErrors = {};
  if (!values.title.trim()) next.title = "Event name is required.";
  if (!values.date) next.date = "Date is required.";
  else if (!isValidDateKey(values.date)) next.date = "Enter a valid date.";
  if (!values.startTime) next.startTime = "Start time is required.";
  // "HH:MM" strings compare correctly as text
  if (values.endTime && values.startTime && values.endTime <= values.startTime) {
    next.endTime = "End time must be after the start time.";
  }
  if (!values.location.trim()) next.location = "Location is required.";
  return next;
}

function toInput(values: ScheduleFormValues): ScheduleEventInput {
  return {
    title: values.title.trim(),
    date: values.date,
    startTime: values.startTime,
    endTime: values.endTime || null,
    location: values.location.trim(),
    description: values.description.trim() || null,
  };
}

const inputClass = (hasError: boolean): string =>
  `w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
    hasError ? "border-red-400" : "border-stone-300"
  }`;

export default function ScheduleFormModal({ mode, initialValues, onSubmit, onCancel }: ScheduleFormModalProps) {
  const [values, setValues] = useState<ScheduleFormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const fieldErrors = validate(values);
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

          <div>
            <label htmlFor="schedule-title" className="block text-sm font-medium text-stone-700 mb-1">
              Event name <span className="text-red-500">*</span>
            </label>
            <input
              id="schedule-title"
              ref={titleRef}
              type="text"
              value={values.title}
              onChange={(e) => update("title", e.target.value)}
              aria-invalid={Boolean(errors.title)}
              className={inputClass(Boolean(errors.title))}
            />
            {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
          </div>

          <div>
            <label htmlFor="schedule-date" className="block text-sm font-medium text-stone-700 mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              id="schedule-date"
              type="date"
              value={values.date}
              onChange={(e) => update("date", e.target.value)}
              aria-invalid={Boolean(errors.date)}
              className={inputClass(Boolean(errors.date))}
            />
            {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="schedule-start" className="block text-sm font-medium text-stone-700 mb-1">
                Start time <span className="text-red-500">*</span>
              </label>
              <input
                id="schedule-start"
                type="time"
                value={values.startTime}
                onChange={(e) => update("startTime", e.target.value)}
                aria-invalid={Boolean(errors.startTime)}
                className={inputClass(Boolean(errors.startTime))}
              />
              {errors.startTime && <p className="text-xs text-red-600 mt-1">{errors.startTime}</p>}
            </div>

            <div>
              <label htmlFor="schedule-end" className="block text-sm font-medium text-stone-700 mb-1">
                End time <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                id="schedule-end"
                type="time"
                value={values.endTime}
                onChange={(e) => update("endTime", e.target.value)}
                aria-invalid={Boolean(errors.endTime)}
                className={inputClass(Boolean(errors.endTime))}
              />
              {errors.endTime && <p className="text-xs text-red-600 mt-1">{errors.endTime}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="schedule-location" className="block text-sm font-medium text-stone-700 mb-1">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              id="schedule-location"
              type="text"
              value={values.location}
              onChange={(e) => update("location", e.target.value)}
              aria-invalid={Boolean(errors.location)}
              className={inputClass(Boolean(errors.location))}
            />
            {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location}</p>}
          </div>

          <div>
            <label htmlFor="schedule-description" className="block text-sm font-medium text-stone-700 mb-1">
              Description <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="schedule-description"
              rows={3}
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
              className={inputClass(false)}
            />
          </div>

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
