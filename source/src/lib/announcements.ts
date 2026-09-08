// Matches the Announcement fields from the data model / Prisma schema
export type Announcement = {
  id: string;
  title: string;
  body: string;
  publishedDate: string;
  author: string;
  tags: { label: string; color: string }[];
  imageUrl?: string; // optional — only some announcements have an attached image
  status: "published" | "draft" | "archived";
};

// TODO: replace with the real logged-in user's name once auth is connected
// (e.g. from the Supabase session), instead of a hardcoded constant.
export const CURRENT_STAFF_NAME = "Narin";

// Placeholder data — replace with a real fetch, e.g.:
// const announcements = await fetch("/api/content/announcement").then(r => r.json());
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "1",
    title: "IUP Orientation 2026",
    body: "The Orientation on Saturday, 18 July 2026 at Building 17 Room 201 and start at 8.30 am. For Software & Knowledge Engineering Students, Please attend this orientation.",
    publishedDate: "17 July 2026",
    author: "Piya",
    tags: [
      { label: "Year 1", color: "bg-yellow-200 text-yellow-900" },
      { label: "Meeting", color: "bg-teal-200 text-teal-900" },
    ],
    status: "published",
  },
  {
    id: "2",
    title: "New Course Materials Posted",
    body: "Additional reading materials for the upcoming module have been uploaded. Please check the resource links page.",
    publishedDate: "1 August 2026",
    author: "Narin",
    tags: [{ label: "CS101", color: "bg-teal-200 text-teal-900" }],
    status: "draft",
  },
];

// Truncates the body for the summary card — the abbreviated ("ฉบับย่อ") view
export function summarize(text: string, maxLength: number = 90): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}
