// Matches the Tag entity from the data model / Prisma schema
export type Tag = {
  id: string;
  name: string;
};

// Placeholder data — replace with a real fetch, e.g.:
// const tags = await fetch("/api/tags").then(r => r.json());
export const TAGS: Tag[] = [
  { id: "year1", name: "Year 1" },
  { id: "year2", name: "Year 2" },
  { id: "year3", name: "Year 3" },
  { id: "year4", name: "Year 4" },
  { id: "everyone", name: "Everyone" },
  { id: "cs101", name: "CS101" },
  { id: "meeting", name: "Meeting" },
];
