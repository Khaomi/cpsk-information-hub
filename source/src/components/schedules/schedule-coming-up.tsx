"use client";

import ScheduleEventItem from "@/src/components/schedules/schedule-event-item";
import { formatDayHeading, type ScheduleEvent } from "@/src/lib/schedules";

export type ComingUpDay = {
  dateKey: string;
  events: ScheduleEvent[]; // non-empty, already sorted by start time
};

type ScheduleComingUpProps = {
  days: ComingUpDay[]; // only days that have events (see getComingUpKeys)
  canManage: boolean;
  onSelectDay: (key: string) => void;
  onEdit: (event: ScheduleEvent) => void;
  onDelete: (id: string) => Promise<void>;
};

export default function ScheduleComingUp({ days, canManage, onSelectDay, onEdit, onDelete }: ScheduleComingUpProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <h2 className="font-semibold mb-3">Coming up</h2>

      {days.length === 0 ? (
        <p className="rounded-md border border-dashed border-stone-300 p-4 text-center text-sm text-stone-500">
          Nothing scheduled.
        </p>
      ) : (
        <div className="space-y-4">
          {days.map((day) => (
            <div key={day.dateKey}>
              <button
                type="button"
                onClick={() => onSelectDay(day.dateKey)}
                className="mb-2 text-sm font-medium text-stone-700 hover:text-teal-700 transition-colors"
              >
                {formatDayHeading(day.dateKey)}
              </button>
              <ul className="space-y-2">
                {day.events.map((event) => (
                  <ScheduleEventItem
                    key={event.id}
                    event={event}
                    canManage={canManage}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onClick={() => onSelectDay(day.dateKey)}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
