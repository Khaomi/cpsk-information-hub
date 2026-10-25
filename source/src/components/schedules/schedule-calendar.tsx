"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, formatDayHeading, formatMonthHeading, mondayIndex, parseDateKey, toDateKey } from "@/src/lib/schedules";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_DOTS = 3;

type ScheduleCalendarProps = {
  year: number;
  month: number; // 0-11, as in Date
  selectedKey: string;
  todayKey: string;
  eventCounts: Record<string, number>;
  onSelect: (key: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

// Monday-first month grid, padded with the neighbouring months' days so
// every row is a full week. The card is h-full and the day rows are 1fr,
// so the grid stretches to whatever height the grid row gives it.
export default function ScheduleCalendar({
  year,
  month,
  selectedKey,
  todayKey,
  eventCounts,
  onSelect,
  onPrevMonth,
  onNextMonth,
}: ScheduleCalendarProps) {
  const firstKey = toDateKey(new Date(year, month, 1));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = mondayIndex(firstKey);
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const gridStart = addDays(firstKey, -leading);
  const cells = Array.from({ length: totalCells }, (_, i) => addDays(gridStart, i));

  return (
    <section className="h-full flex flex-col rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="Previous month"
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-stone-100 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-stone-600" />
        </button>
        <h2 className="font-semibold">{formatMonthHeading(year, month)}</h2>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Next month"
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-stone-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-stone-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-xs font-medium text-stone-400">
            {label}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-1">
        {cells.map((key) => {
          const inMonth = parseDateKey(key).getMonth() === month;
          const isSelected = key === selectedKey;
          const isToday = key === todayKey;
          const count = eventCounts[key] ?? 0;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-label={`${formatDayHeading(key)}${count > 0 ? `, ${count} event${count === 1 ? "" : "s"}` : ""}`}
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
              className={`min-h-11 flex flex-col items-center rounded-md pt-1.5 pb-1.5 text-sm transition-colors ${
                isSelected
                  ? "bg-teal-600 text-white font-semibold"
                  : inMonth
                    ? "text-stone-800 hover:bg-stone-100"
                    : "text-stone-300 hover:bg-stone-50"
              } ${isToday ? `ring-2 ring-inset ${isSelected ? "ring-teal-800" : "ring-teal-600"}` : ""}`}
            >
              {parseDateKey(key).getDate()}
              <span className="mt-auto flex gap-0.5 h-1.5">
                {Array.from({ length: Math.min(count, MAX_DOTS) }, (_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : inMonth ? "bg-teal-500" : "bg-teal-200"}`}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
