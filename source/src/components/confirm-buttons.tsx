"use client";

type ConfirmButtonsProps = {
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  // "strong" is for actions that can't be undone, like a permanent delete
  tone?: "default" | "strong";
  disabled?: boolean;
  className?: string;
};

const CONFIRM_CLASS = {
  default: "bg-red-600 hover:bg-red-700",
  strong: "bg-red-700 hover:bg-red-800",
};

const CANCEL_HOVER_CLASS = {
  default: "hover:bg-stone-50",
  strong: "hover:bg-white",
};

// "Yes, do it" + "Cancel" pair shown inside an inline confirmation box
export function ConfirmButtons({
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  tone = "default",
  disabled = false,
  className = "flex gap-2",
}: ConfirmButtonsProps) {
  return (
    <div className={className}>
      <button
        type="button"
        onClick={onConfirm}
        disabled={disabled}
        className={`text-xs font-medium ${CONFIRM_CLASS[tone]} text-white rounded px-3 py-1.5 transition-colors disabled:opacity-60`}
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={disabled}
        className={`text-xs font-medium border border-stone-300 rounded px-3 py-1.5 ${CANCEL_HOVER_CLASS[tone]} transition-colors`}
      >
        {cancelLabel}
      </button>
    </div>
  );
}
