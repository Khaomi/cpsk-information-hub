// Schedule events (US-3 view, US-8 create/edit, BL-07), stored in the
// public.schedule table (supabase/migrations/20261108120000_create_schedule_table.sql).
// Who may add/edit/delete is enforced there by RLS (staff only), not here.

import { createClient } from "@/src/lib/supabase/client";
import type { Tag } from "@/src/lib/tags";
import type { TablesInsert } from "@/types/database.types";

// Dates are local calendar dates kept as "YYYY-MM-DD" strings. Never feed
// them to new Date("YYYY-MM-DD") or produce them with toISOString(): both go
// through UTC and can shift the day by one in Thailand (UTC+7).
export type ScheduleEvent = {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM" (24h)
  endTime: string; // "HH:MM" (24h), after startTime
  location: string;
  description: string | null;
  tags: Tag[]; // from public.schedule_tag, sorted by name
};

// What the form submits: the chosen tags as ids, not whole Tag objects
export type ScheduleEventInput = Omit<ScheduleEvent, "id" | "tags"> & { tagIds: string[] };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// Builds the Date from year/month/day numbers, so it is local midnight
export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function isValidDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  // Round-trip catches impossible dates like 2026-02-31
  return toDateKey(parseDateKey(key)) === key;
}

export function getTodayKey(): string {
  return toDateKey(new Date());
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key);
  return toDateKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

// 0 = Monday ... 6 = Sunday (getDay() counts from Sunday)
export function mondayIndex(key: string): number {
  return (parseDateKey(key).getDay() + 6) % 7;
}

// "Coming up" for a selected day: the rest of its Mon–Sun week after it
// (Mon → Tue–Sun, ..., Sat → Sun). Sunday has nothing left in its week,
// so it shows the following Monday instead.
export function getComingUpKeys(selectedKey: string): string[] {
  const index = mondayIndex(selectedKey);
  if (index === 6) return [addDays(selectedKey, 1)];

  const keys: string[] = [];
  for (let offset = 1; offset <= 6 - index; offset++) {
    keys.push(addDays(selectedKey, offset));
  }
  return keys;
}

export function formatDayHeading(key: string): string {
  return parseDateKey(key).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatMonthHeading(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export function formatTimeRange(event: Pick<ScheduleEvent, "startTime" | "endTime">): string {
  return `${event.startTime} – ${event.endTime}`;
}

export type CurrentMoment = {
  dateKey: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
};

export function getCurrentMoment(): CurrentMoment {
  const now = new Date();
  return { dateKey: toDateKey(now), time: `${pad(now.getHours())}:${pad(now.getMinutes())}` };
}

// True while the event is in progress (start inclusive, end exclusive)
export function isHappeningNow(event: ScheduleEvent, now: CurrentMoment): boolean {
  return event.date === now.dateKey && event.startTime <= now.time && now.time < event.endTime;
}

// "HH:MM" strings compare correctly as text
export function compareByStartTime(a: ScheduleEvent, b: ScheduleEvent): number {
  return (
    a.startTime.localeCompare(b.startTime) ||
    a.endTime.localeCompare(b.endTime) ||
    a.title.localeCompare(b.title)
  );
}

// ---- Supabase ----

type ScheduleInsert = TablesInsert<"schedule">;
type SupabaseClient = ReturnType<typeof createClient>;

// Each schedule row comes back with its tags embedded through schedule_tag
const SCHEDULE_SELECT =
  "id, title, event_date, start_time, end_time, location, description, schedule_tag(tag(id, name, category))";

type ScheduleRowWithTags = {
  id: string;
  title: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string | null;
  schedule_tag: { tag: Tag | null }[];
};

// Postgres returns TIME as "HH:MM:SS"; the page works in "HH:MM"
function toHourMinute(time: string): string {
  return time.slice(0, 5);
}

function toEvent(row: ScheduleRowWithTags): ScheduleEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.event_date, // DATE comes back as "YYYY-MM-DD", no timezone involved
    startTime: toHourMinute(row.start_time),
    endTime: toHourMinute(row.end_time),
    location: row.location,
    description: row.description,
    tags: row.schedule_tag
      .map((link) => link.tag)
      .filter((tag): tag is Tag => tag !== null)
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

// creator_id is not sent: the column defaults to auth.uid() and RLS checks it.
// tagIds is not a column; it is saved separately by syncTags.
function toRow(values: ScheduleEventInput): ScheduleInsert {
  return {
    title: values.title,
    event_date: values.date,
    start_time: values.startTime,
    end_time: values.endTime,
    location: values.location,
    description: values.description,
  };
}

// Replaces the event's tag links with exactly tagIds
async function syncTags(supabase: SupabaseClient, scheduleId: string, tagIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase.from("schedule_tag").delete().eq("schedule_id", scheduleId);
  if (deleteError) throw deleteError;

  if (tagIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("schedule_tag")
    .insert(tagIds.map((tagId) => ({ schedule_id: scheduleId, tag_id: tagId })));
  if (insertError) throw insertError;
}

async function fetchScheduleById(supabase: SupabaseClient, id: string): Promise<ScheduleEvent> {
  const { data, error } = await supabase.from("schedule").select(SCHEDULE_SELECT).eq("id", id).single();
  if (error) throw error;
  return toEvent(data as ScheduleRowWithTags);
}

export async function fetchSchedules(): Promise<ScheduleEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schedule")
    .select(SCHEDULE_SELECT)
    .order("event_date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as ScheduleRowWithTags[]).map(toEvent);
}

// The event row and its tag links are two writes. If the tag step fails the
// event is already saved, so the error still reaches the form ("Could not
// save") and the list is refreshed by Realtime with what was actually stored.
export async function insertSchedule(values: ScheduleEventInput): Promise<ScheduleEvent> {
  const supabase = createClient();
  const { data, error } = await supabase.from("schedule").insert(toRow(values)).select("id").single();
  if (error) throw error;

  await syncTags(supabase, data.id, values.tagIds);
  return fetchScheduleById(supabase, data.id);
}

// .single() makes "no row updated" an error: RLS hides rows the user may not
// change instead of failing, so without it a blocked edit would look saved.
export async function updateSchedule(id: string, values: ScheduleEventInput): Promise<ScheduleEvent> {
  const supabase = createClient();
  const { error } = await supabase.from("schedule").update(toRow(values)).eq("id", id).select("id").single();
  if (error) throw error;

  await syncTags(supabase, id, values.tagIds);
  return fetchScheduleById(supabase, id);
}

// Same reason as updateSchedule: check a row was actually deleted.
// The schedule_tag links are removed by ON DELETE CASCADE.
export async function deleteSchedule(id: string): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase.from("schedule").delete().eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(`Schedule event ${id} was not deleted`);
}

type Unsubscribe = () => void;

// Both tables are in the supabase_realtime publication with REPLICA IDENTITY
// FULL, and Realtime applies their SELECT policies, so every signed-in viewer
// gets changes made by staff (including tag changes) without refreshing.
export function subscribeToSchedules(onChange: () => void): Unsubscribe {
  const supabase = createClient();
  const channel = supabase
    .channel("schedules-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "schedule" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "schedule_tag" }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
