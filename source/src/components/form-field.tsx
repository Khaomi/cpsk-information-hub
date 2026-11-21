import type { ReactNode } from "react";

// Shared styling for text-like inputs in the create/edit forms. A field with
// an error gets a red border so it stands out next to its message.
export const inputClass = (hasError: boolean): string =>
  `w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${
    hasError ? "border-red-400" : "border-stone-300"
  }`;

type FormFieldProps = {
  id: string;
  label: ReactNode;
  // Shows a red asterisk after the label
  required?: boolean;
  // Grey text after the label, e.g. "(optional)"
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
};

// Label + input + error message, the block every form field repeats
export function FormField({ id, label, required = false, hint, error, children }: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-stone-700 mb-1">
        {label}
        {required && (
          <>
            {" "}
            <span className="text-red-500">*</span>
          </>
        )}
        {hint && (
          <>
            {" "}
            <span className="text-stone-400 font-normal">{hint}</span>
          </>
        )}
      </label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 mt-1">{message}</p>;
}
