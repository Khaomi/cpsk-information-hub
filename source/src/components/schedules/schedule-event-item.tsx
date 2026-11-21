"use client";

import { useState } from "react";
import { MapPin, Pencil, Trash2 } from "lucide-react";
import { formatTimeRange, type ScheduleEvent } from "@/src/lib/schedules";
import { TagBadges } from "@/src/components/tag-badges";
import { ConfirmButtons } from "@/src/components/confirm-buttons";

type ScheduleEventItemProps = {
  event: ScheduleEvent;
  canManage: boolean;
  onEdit: (event: ScheduleEvent) => void;
  onDelete: (id: string) => Promise<void>;
  // When set, the event body becomes a button (used by "Coming up" to jump to that day)
  onClick?: () => void;
  // Orange box for an event that is in progress right now
  highlight?: boolean;
};

export default function ScheduleEventItem({ event, canManage, onEdit, onDelete, onClick, highlight = false }: ScheduleEventItemProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const body = <ScheduleEventBody event={event} highlight={highlight} />;

  return (
    <li className={`rounded-md border p-3 ${highlight ? "border-orange-300 bg-orange-50" : "border-stone-200 bg-white"}`}>
      <div className="flex items-start gap-2">
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            className="flex flex-1 min-w-0 items-start gap-3 text-left rounded hover:bg-stone-50 transition-colors"
          >
            {body}
          </button>
        ) : (
          <div className="flex flex-1 min-w-0 items-start gap-3">{body}</div>
        )}

        {canManage && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => onEdit(event)}
              aria-label={`Edit ${event.title}`}
              className="w-7 h-7 flex items-center justify-center rounded-md text-stone-500 hover:bg-stone-100 hover:text-teal-700 transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              aria-label={`Delete ${event.title}`}
              className="w-7 h-7 flex items-center justify-center rounded-md text-stone-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {canManage && confirmingDelete && (
        <DeleteEventConfirm onDelete={() => onDelete(event.id)} onCancel={() => setConfirmingDelete(false)} />
      )}
    </li>
  );
}

// Time, title, location, description and tags of one event
function ScheduleEventBody({ event, highlight }: { event: ScheduleEvent; highlight: boolean }) {
  return (
    <>
      <span
        className={`w-24 shrink-0 pt-0.5 text-xs font-medium tabular-nums ${highlight ? "text-orange-700" : "text-teal-700"}`}
      >
        {formatTimeRange(event)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-sm leading-snug">
          {event.title}
          {highlight && <span className="sr-only"> (happening now)</span>}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
          <MapPin className="w-3 h-3 shrink-0" />
          {event.location}
        </span>
        {event.description && (
          <span className="mt-1 block text-sm text-stone-600 leading-relaxed whitespace-pre-line">{event.description}</span>
        )}
        {(event.tags.length > 0 || event.departmentOnly) && (
          <span className="mt-1.5 flex flex-wrap gap-1">
            <TagBadges tags={event.tags} departmentOnly={event.departmentOnly} textClassName="text-[11px]" />
          </span>
        )}
      </span>
    </>
  );
}

// On success the item unmounts (the page drops it from the list); on
// failure the confirm box stays open with a message so it can be retried.
function DeleteEventConfirm({ onDelete, onCancel }: { onDelete: () => Promise<void>; onCancel: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);

  const handleDelete = async (): Promise<void> => {
    setDeleting(true);
    setDeleteError(false);
    try {
      await onDelete();
    } catch {
      setDeleteError(true);
      setDeleting(false);
    }
  };

  return (
    <div className="mt-2 pt-2 border-t border-stone-100">
      <p className="text-xs text-red-700 font-medium mb-2">Delete this event? This cannot be undone.</p>
      {deleteError && <p className="text-xs text-red-600 mb-2">Could not delete the event. Please try again.</p>}
      <ConfirmButtons
        confirmLabel="Yes, delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onCancel={onCancel}
        disabled={deleting}
      />
    </div>
  );
}
