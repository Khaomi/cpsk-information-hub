// Schedule events (US-3 view, US-8 create/edit, BL-07).
//
// TODO: there is no schedule table yet — everything below is an in-memory
// mock that resets on a full page refresh. The fetch/insert/update/delete
// functions are async on purpose so they can be swapped for Supabase calls
// (like src/lib/announcements.ts) without changing the page.

// Dates are local calendar dates kept as "YYYY-MM-DD" strings. Never feed
// them to new Date("YYYY-MM-DD") or produce them with toISOString(): both go
// through UTC and can shift the day by one in Thailand (UTC+7).
export type ScheduleEvent = {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM" (24h)
  endTime: string | null; // "HH:MM" (24h), after startTime
  location: string;
  description: string | null;
};

export type ScheduleEventInput = Omit<ScheduleEvent, "id">;

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
  return event.endTime ? `${event.startTime} – ${event.endTime}` : event.startTime;
}

export type CurrentMoment = {
  dateKey: string; // "YYYY-MM-DD"
  time: string; // "HH:MM"
};

export function getCurrentMoment(): CurrentMoment {
  const now = new Date();
  return { dateKey: toDateKey(now), time: `${pad(now.getHours())}:${pad(now.getMinutes())}` };
}

// True while the event is in progress (start inclusive, end exclusive).
// Events without an end time have no known duration, so they never count.
export function isHappeningNow(event: ScheduleEvent, now: CurrentMoment): boolean {
  return (
    event.date === now.dateKey &&
    event.endTime !== null &&
    event.startTime <= now.time &&
    now.time < event.endTime
  );
}

// "HH:MM" strings compare correctly as text
export function compareByStartTime(a: ScheduleEvent, b: ScheduleEvent): number {
  return (
    a.startTime.localeCompare(b.startTime) ||
    (a.endTime ?? "").localeCompare(b.endTime ?? "") ||
    a.title.localeCompare(b.title)
  );
}

// ---- In-memory mock store ----

let events: ScheduleEvent[] | null = null;
let nextId = 1;

function newId(): string {
  return `mock-${nextId++}`;
}

// Seeded relative to today so the page always has something to show
function seedEvents(): ScheduleEvent[] {
  const today = getTodayKey();
  const at = (offset: number, event: Omit<ScheduleEventInput, "date">): ScheduleEvent => ({
    id: newId(),
    date: addDays(today, offset),
    ...event,
  });

  return [
    at(-7, { title: "Department seminar", startTime: "13:00", endTime: "15:00", location: "Room 204", description: "Guest talk on cloud-native systems." }),
    at(-2, { title: "Software Process lecture", startTime: "09:00", endTime: "12:00", location: "Room 301", description: null }),
    at(0, { title: "ISP sprint review", startTime: "13:30", endTime: "15:00", location: "Lab 1", description: "Each team demos the current iteration." }),
    at(0, { title: "Web Programming lab", startTime: "09:00", endTime: "12:00", location: "Lab 2", description: "Bring your laptop." }),
    at(1, { title: "Lecturer office hours", startTime: "10:00", endTime: "11:30", location: "Room 105", description: "Drop in with questions about the project." }),
    at(2, { title: "Project proposal deadline", startTime: "23:59", endTime: null, location: "Online submission", description: "Submit the proposal PDF before midnight." }),
    at(3, { title: "Data Structures midterm", startTime: "09:00", endTime: "12:00", location: "Exam Hall A", description: "Bring your student ID card." }),
    at(3, { title: "Club fair", startTime: "12:00", endTime: "13:00", location: "Building lobby", description: null }),
    at(3, { title: "Thesis consultation", startTime: "14:00", endTime: "15:00", location: "Room 105", description: null }),
    at(3, { title: "Department meeting", startTime: "16:00", endTime: "17:00", location: "Meeting room", description: "Staff only." }),
    at(5, { title: "Hackathon kick-off", startTime: "10:00", endTime: "17:00", location: "Lab 1", description: null }),
    at(8, { title: "Career talk", startTime: "15:00", endTime: "16:30", location: "Room 204", description: "Alumni share their internship experience." }),
    at(14, { title: "Course registration opens", startTime: "08:00", endTime: null, location: "Registrar website", description: null }),
  ];
}

function store(): ScheduleEvent[] {
  if (!events) events = seedEvents();
  return events;
}

export async function fetchSchedules(): Promise<ScheduleEvent[]> {
  return store().map((e) => ({ ...e }));
}

export async function insertSchedule(values: ScheduleEventInput): Promise<ScheduleEvent> {
  const created: ScheduleEvent = { id: newId(), ...values };
  events = [...store(), created];
  return { ...created };
}

export async function updateSchedule(id: string, values: ScheduleEventInput): Promise<ScheduleEvent> {
  const existing = store().find((e) => e.id === id);
  if (!existing) throw new Error(`Schedule event ${id} not found`);

  const updated: ScheduleEvent = { ...existing, ...values };
  events = store().map((e) => (e.id === id ? updated : e));
  return { ...updated };
}

export async function deleteSchedule(id: string): Promise<void> {
  events = store().filter((e) => e.id !== id);
}
