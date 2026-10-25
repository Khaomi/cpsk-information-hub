"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useRole } from "@/src/components/role-context";
import ScheduleCalendar from "@/src/components/schedules/schedule-calendar";
import ScheduleComingUp, { ComingUpDay } from "@/src/components/schedules/schedule-coming-up";
import ScheduleDayList from "@/src/components/schedules/schedule-day-list";
import ScheduleFormModal, {
  emptyScheduleFormValues,
  scheduleFormValuesFrom,
} from "@/src/components/schedules/schedule-form-modal";
import {
  CurrentMoment,
  ScheduleEvent,
  ScheduleEventInput,
  compareByStartTime,
  deleteSchedule,
  fetchSchedules,
  getComingUpKeys,
  getCurrentMoment,
  getTodayKey,
  insertSchedule,
  parseDateKey,
  updateSchedule,
} from "@/src/lib/schedules";

type FormState = { mode: "create" } | { mode: "edit"; event: ScheduleEvent } | null;

export default function SchedulesPage() {
  // TODO: this only hides the controls in the UI. Once a schedule API exists,
  // the staff/lecturer/admin check must also be enforced on the server
  // (e.g. RLS policies on the schedule table), like announcements.
  const { isStaff } = useRole();

  const [items, setItems] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayKey, setTodayKey] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [view, setView] = useState({ year: 0, month: 0 });
  const [form, setForm] = useState<FormState>(null);
  const [now, setNow] = useState<CurrentMoment | null>(null);

  const loadItems = (): Promise<void> => fetchSchedules().then(setItems);

  useEffect(() => {
    fetchSchedules()
      .then((list) => {
        // "Today" is read on the client after mount rather than during render,
        // so a page prerendered on another day can't mismatch on hydration.
        const today = getTodayKey();
        const d = parseDateKey(today);
        setItems(list);
        setTodayKey(today);
        setSelectedKey(today);
        setView({ year: d.getFullYear(), month: d.getMonth() });
        setNow(getCurrentMoment());
      })
      .finally(() => setLoading(false));
  }, []);

  // Re-read the clock so the "happening now" highlight moves on its own
  useEffect(() => {
    const timer = setInterval(() => setNow(getCurrentMoment()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const eventsByDate = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {};
    for (const event of items) {
      (map[event.date] ??= []).push(event);
    }
    for (const list of Object.values(map)) list.sort(compareByStartTime);
    return map;
  }, [items]);

  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [key, list] of Object.entries(eventsByDate)) counts[key] = list.length;
    return counts;
  }, [eventsByDate]);

  const comingUpDays: ComingUpDay[] = selectedKey
    ? getComingUpKeys(selectedKey)
        .filter((key) => eventsByDate[key]?.length)
        .map((key) => ({ dateKey: key, events: eventsByDate[key] }))
    : [];

  // Selecting a day also moves the calendar to that day's month
  const selectDay = (key: string): void => {
    const d = parseDateKey(key);
    setSelectedKey(key);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const shiftMonth = (delta: number): void => {
    setView((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const handleSave = async (values: ScheduleEventInput): Promise<void> => {
    if (!form) return;
    if (form.mode === "create") {
      await insertSchedule(values);
    } else {
      await updateSchedule(form.event.id, values);
    }
    await loadItems();
    setForm(null);
    // Show the day the event was saved on, so the change is visible
    selectDay(values.date);
  };

  const handleDelete = async (id: string): Promise<void> => {
    await deleteSchedule(id);
    await loadItems();
  };

  const handleEdit = (event: ScheduleEvent): void => setForm({ mode: "edit", event });

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Schedules</h1>
        {isStaff && (
          <button
            type="button"
            onClick={() => setForm({ mode: "create" })}
            disabled={loading}
            className="flex items-center gap-1 rounded-md bg-teal-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-teal-700 transition-colors disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            Add event
          </button>
        )}
      </div>

      {loading || !selectedKey || !now ? (
        <p className="text-sm text-stone-500">Loading...</p>
      ) : (
        // Equal columns from sm up with the calendar on the left; on phones the
        // calendar comes first, then the selected day, then "Coming up". Grid
        // items stretch to the row height, so the calendar matches the right
        // column's height.
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="min-w-0">
            <ScheduleCalendar
              year={view.year}
              month={view.month}
              selectedKey={selectedKey}
              todayKey={todayKey}
              eventCounts={eventCounts}
              onSelect={selectDay}
              onPrevMonth={() => shiftMonth(-1)}
              onNextMonth={() => shiftMonth(1)}
            />
          </div>

          <div className="min-w-0 flex flex-col gap-4">
            <ScheduleDayList
              dateKey={selectedKey}
              isToday={selectedKey === todayKey}
              events={eventsByDate[selectedKey] ?? []}
              now={now}
              canManage={isStaff}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
            <ScheduleComingUp
              days={comingUpDays}
              canManage={isStaff}
              onSelectDay={selectDay}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
        </div>
      )}

      {isStaff && form && (
        <ScheduleFormModal
          mode={form.mode}
          initialValues={form.mode === "edit" ? scheduleFormValuesFrom(form.event) : emptyScheduleFormValues(selectedKey)}
          onSubmit={handleSave}
          onCancel={() => setForm(null)}
        />
      )}
    </div>
  );
}
