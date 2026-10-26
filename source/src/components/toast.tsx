"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";

type ToastProps = {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
};

export default function Toast({ message, onDismiss, durationMs = 2500 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [onDismiss, durationMs]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-stone-900 text-white text-sm rounded-full px-4 py-2.5 shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
      <Check className="w-4 h-4 text-emerald-400" />
      {message}
    </div>
  );
}
