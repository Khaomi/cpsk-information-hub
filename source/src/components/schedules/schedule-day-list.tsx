"use client";

import ScheduleEventItem from "@/src/components/schedules/schedule-event-item";
import { formatDayHeading, isHappeningNow, type CurrentMoment, type ScheduleEvent } from "@/src/lib/schedules";

type ScheduleDayListProps = {
  dateKey: string;
  isToday: boolean;
  events: ScheduleEvent[]; // already sorted by start time
  now: CurrentMoment;
  canManage: boolean;
  onEdit: (event: ScheduleEvent) => void;
  onDelete: (id: string) => Promise<void>;
};

// Timetable for the day selected on the calendar
export default function ScheduleDayList({ dateKey, isToday, events, now, canManage, onEdit, onDelete }: ScheduleDayListProps) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-4">
      <h2 className="font-semibold">{isToday ? "Today" : "Selected day"}</h2>
      <p className="text-sm text-stone-500 mb-3">{formatDayHeading(dateKey)}</p>

      {events.length === 0 ? (
        <p className="rounded-md border border-dashed border-stone-300 p-4 text-center text-sm text-stone-500">
          Nothing scheduled.
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <ScheduleEventItem
              key={event.id}
              event={event}
              canManage={canManage}
              onEdit={onEdit}
              onDelete={onDelete}
              highlight={isHappeningNow(event, now)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
