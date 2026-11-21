"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRole } from "@/src/components/role-context";
import { useSearchParams } from "next/navigation";
import FilterableLayout from "@/src/components/filterable-layout";
import ScheduleCalendar from "@/src/components/schedules/schedule-calendar";
import ScheduleComingUp, { ComingUpDay } from "@/src/components/schedules/schedule-coming-up";
import ScheduleDayList from "@/src/components/schedules/schedule-day-list";
import ScheduleFormModal, {
  emptyScheduleFormValues,
  scheduleFormValuesFrom,
} from "@/src/components/schedules/schedule-form-modal";
import {
  CurrentMoment,
  EventsByDate,
  MonthView,
  ScheduleEvent,
  ScheduleEventInput,
  deleteSchedule,
  fetchSchedules,
  getComingUpKeys,
  getCurrentMoment,
  getTodayKey,
  groupVisibleEventsByDate,
  insertSchedule,
  monthViewOf,
  pickSearchJumpTarget,
  subscribeToSchedules,
  updateSchedule,
} from "@/src/lib/schedules";
import { fetchTags, type Tag } from "@/src/lib/tags";

type FormState = { mode: "create" } | { mode: "edit"; event: ScheduleEvent } | null;

// Events are created from the header's "+ New" → /new → "Schedule", which
// links to /schedules?new=1. Reads the param once, then drops it from the URL
// so a refresh or Back doesn't open the form again. window.location is used
// rather than useSearchParams, which would need a Suspense boundary for the build.
function consumeCreateRequest(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get("new") !== "1") return false;

  params.delete("new");
  const query = params.toString();
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
  );
  return true;
}

// "Coming up" list for the selected day: only the days that have events
function comingUpDaysFor(selectedKey: string, eventsByDate: EventsByDate): ComingUpDay[] {
  if (!selectedKey) return [];
  return getComingUpKeys(selectedKey)
    .filter((key) => eventsByDate[key]?.length)
    .map((key) => ({ dateKey: key, events: eventsByDate[key] }));
}

// Jump to a matching day when the search term changes. Remembers which query
// it already jumped for, so later changes (clicking another day, live
// updates) don't pull the selection back. This runs during render, guarded
// so it settles after one extra pass, instead of in an effect.
function useJumpToSearchMatch(
  query: string,
  eventsByDate: EventsByDate,
  selectedKey: string,
  todayKey: string,
  selectDay: (key: string) => void,
): void {
  const [jumpedQuery, setJumpedQuery] = useState("");

  if (!query && jumpedQuery !== "") {
    setJumpedQuery("");
  } else if (query && query !== jumpedQuery && selectedKey && todayKey) {
    // No matches yet: leave jumpedQuery alone so it retries when data arrives.
    const target = pickSearchJumpTarget(eventsByDate, selectedKey, todayKey);
    if (target) {
      setJumpedQuery(query);
      // Also re-syncs the calendar to that day's month.
      selectDay(target);
    }
  }
}

// Two equal columns once the content area is at least 36rem wide, with the
// calendar on the left; narrower, the calendar comes first, then the selected
// day, then "Coming up". This uses the content area's width (@container), not
// the screen's, because the filter sidebar takes space from md up. In two
// columns the right one is taken out of flow (absolute), so the calendar alone
// sets the row height and the lists scroll inside that height.
function ScheduleColumns({ calendar, children }: { calendar: ReactNode; children: ReactNode }) {
  return (
    <div className="@container">
      <div className="grid grid-cols-1 @xl:grid-cols-2 gap-4">
        <div className="min-w-0">{calendar}</div>
        <div className="min-w-0 @xl:relative">
          <div className="flex flex-col gap-4 @xl:absolute @xl:inset-0 @xl:overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function SchedulesPage() {
  // This only hides the controls; the real staff-only check is the RLS
  // policies on public.schedule, so a student can't write via the API either.
  const { isStaff } = useRole();
  const searchParams = useSearchParams();
  const query = (searchParams.get("query") ?? "").trim().toLowerCase();

  const [items, setItems] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [todayKey, setTodayKey] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [view, setView] = useState<MonthView>({ year: 0, month: 0 });
  const [form, setForm] = useState<FormState>(null);
  const [now, setNow] = useState<CurrentMoment | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  // Tag names chosen in the filter drawer; empty means show every event
  const [filterTags, setFilterTags] = useState<string[]>([]);
  // Set when the page was opened as /schedules?new=1 (see consumeCreateRequest)
  const [createRequested, setCreateRequested] = useState(false);

  useEffect(() => {
    const wantsCreate = consumeCreateRequest();

    fetchSchedules()
      .then((list) => {
        // "Today" is read on the client after mount rather than during render,
        // so a page prerendered on another day can't mismatch on hydration.
        const today = getTodayKey();
        setItems(list);
        setTodayKey(today);
        setSelectedKey(today);
        setView(monthViewOf(today));
        setNow(getCurrentMoment());
        // Only ever switch it on: in dev, Strict Mode runs this effect twice,
        // and the second run no longer sees ?new=1 (the first removed it), so
        // passing wantsCreate through would close the form the first run opened.
        if (wantsCreate) setCreateRequested(true);
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

  const eventsByDate = useMemo(() => groupVisibleEventsByDate(items, filterTags, query), [items, filterTags, query]);

  const eventCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const [key, list] of Object.entries(eventsByDate)) counts[key] = list.length;
    return counts;
  }, [eventsByDate]);

  // Selecting a day also moves the calendar to that day's month
  const selectDay = (key: string): void => {
    setSelectedKey(key);
    setView(monthViewOf(key));
  };

  useJumpToSearchMatch(query, eventsByDate, selectedKey, todayKey, selectDay);

  const shiftMonth = (delta: number): void => {
    setView((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  // The open form: an explicit edit, or the add form asked for by ?new=1.
  // isStaff is false until the role has loaded, so the add form only appears
  // once we know the user is staff (and never for anyone else).
  const activeForm: FormState = form ?? (createRequested && isStaff ? { mode: "create" } : null);

  const closeForm = (): void => {
    setForm(null);
    setCreateRequested(false);
  };

  const handleSave = async (values: ScheduleEventInput): Promise<void> => {
    if (!activeForm) return;
    // Apply the saved row straight to the list rather than refetching, so a
    // failed refetch can't report an event that was saved as "not saved".
    if (activeForm.mode === "create") {
      const created = await insertSchedule(values);
      setItems((prev) => [...prev.filter((e) => e.id !== created.id), created]);
    } else {
      const updated = await updateSchedule(activeForm.event.id, values);
      setItems((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    }
    closeForm();
    // Show the day the event was saved on, so the change is visible
    selectDay(values.date);
  };

  const handleDelete = async (id: string): Promise<void> => {
    await deleteSchedule(id);
    setItems((prev) => prev.filter((e) => e.id !== id));
  };

  const handleEdit = (event: ScheduleEvent): void => setForm({ mode: "edit", event });

  return (
    <FilterableLayout onApplyFilter={setFilterTags}>
      <h1 className="text-2xl font-bold mb-4">Schedules</h1>

      {loadError ? (
        <p className="text-sm text-red-600">Could not load schedules. Please refresh the page to try again.</p>
      ) : loading || !selectedKey || !now ? (
        <p className="text-sm text-stone-500">Loading...</p>
      ) : (
        <ScheduleColumns
          calendar={
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
          }
        >
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
            days={comingUpDaysFor(selectedKey, eventsByDate)}
            canManage={isStaff}
            onSelectDay={selectDay}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </ScheduleColumns>
      )}

      {isStaff && activeForm && (
        <ScheduleFormModal
          mode={activeForm.mode}
          initialValues={
            activeForm.mode === "edit" ? scheduleFormValuesFrom(activeForm.event) : emptyScheduleFormValues(selectedKey)
          }
          tags={tags}
          onSubmit={handleSave}
          onCancel={closeForm}
        />
      )}
    </FilterableLayout>
  );
}
