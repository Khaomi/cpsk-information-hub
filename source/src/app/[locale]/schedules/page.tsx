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
  subscribeToSchedules,
  updateSchedule,
} from "@/src/lib/schedules";
import { fetchTags, type Tag } from "@/src/lib/tags";

type FormState = { mode: "create" } | { mode: "edit"; event: ScheduleEvent } | null;

export default function SchedulesPage() {
  // This only hides the controls; the real staff-only check is the RLS
  // policies on public.schedule, so a student can't write via the API either.
  const { isStaff } = useRole();

  const [items, setItems] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [todayKey, setTodayKey] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [view, setView] = useState({ year: 0, month: 0 });
  const [form, setForm] = useState<FormState>(null);
  const [now, setNow] = useState<CurrentMoment | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);

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
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  // Tags to pick from in the add/edit form. Only staff can open the form, so
  // nobody else needs them. If they fail to load the form still works, just
  // with no tags to choose.
  useEffect(() => {
    if (!isStaff) return;
    fetchTags()
      .then(setTags)
      .catch(() => {});
  }, [isStaff]);

  // Live updates when anyone (another staff member, another tab) changes a
  // schedule. A failed refetch keeps the list already on screen.
  useEffect(
    () =>
      subscribeToSchedules(() => {
        fetchSchedules()
          .then(setItems)
          .catch(() => {});
      }),
    [],
  );

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
    // Apply the saved row straight to the list rather than refetching, so a
    // failed refetch can't report an event that was saved as "not saved".
    if (form.mode === "create") {
      const created = await insertSchedule(values);
      setItems((prev) => [...prev.filter((e) => e.id !== created.id), created]);
    } else {
      const updated = await updateSchedule(form.event.id, values);
      setItems((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    }
    setForm(null);
    // Show the day the event was saved on, so the change is visible
    selectDay(values.date);
  };

  const handleDelete = async (id: string): Promise<void> => {
    await deleteSchedule(id);
    setItems((prev) => prev.filter((e) => e.id !== id));
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
            disabled={loading || loadError}
            className="flex items-center gap-1 rounded-md bg-teal-600 text-white text-sm font-medium px-3 py-1.5 hover:bg-teal-700 transition-colors disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            Add event
          </button>
        )}
      </div>

      {loadError ? (
        <p className="text-sm text-red-600">Could not load schedules. Please refresh the page to try again.</p>
      ) : loading || !selectedKey || !now ? (
        <p className="text-sm text-stone-500">Loading...</p>
      ) : (
        // Equal columns from sm up with the calendar on the left; on phones the
        // calendar comes first, then the selected day, then "Coming up". From sm
        // up the right column is taken out of flow (absolute), so the calendar
        // alone sets the row height and the lists scroll inside that height.
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

          <div className="min-w-0 sm:relative">
            <div className="flex flex-col gap-4 sm:absolute sm:inset-0 sm:overflow-y-auto">
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
        </div>
      )}

      {isStaff && form && (
        <ScheduleFormModal
          mode={form.mode}
          initialValues={form.mode === "edit" ? scheduleFormValuesFrom(form.event) : emptyScheduleFormValues(selectedKey)}
          tags={tags}
          onSubmit={handleSave}
          onCancel={() => setForm(null)}
        />
      )}
    </div>
  );
}
