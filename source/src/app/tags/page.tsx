"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { colorForTag, createTag, deleteTag, fetchTags, Tag, TagCategory, updateTag } from "@/src/lib/tags";
import { useRole } from "@/src/components/role-context";

const CATEGORIES: { value: TagCategory; label: string }[] = [
  { value: "year", label: "Year" },
  { value: "course", label: "Course" },
  { value: "activity", label: "Activity" },
];

type TagDraft = { name: string; category: TagCategory | null };

const emptyDraft: TagDraft = { name: "", category: null };

export default function TagsPage() {
  const router = useRouter();
  const { user, isStaff, loading } = useRole();
  const [tags, setTags] = useState<Tag[]>([]);
  const [draft, setDraft] = useState<TagDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<TagDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canManageTags = isStaff;

  useEffect(() => {
    if (!loading && !canManageTags) router.replace("/");
  }, [canManageTags, loading, router]);

  useEffect(() => {
    if (canManageTags) fetchTags().then(setTags).catch(() => setError("Unable to load tags."));
  }, [canManageTags]);

  const validateDraft = (value: TagDraft): string | null => {
    if (!value.name.trim()) return "Enter a tag name.";
    if (value.name.trim().length > 80) return "Tag names must be 80 characters or fewer.";
    return null;
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const validationError = validateDraft(draft);
    if (validationError || !user) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const tag = await createTag(draft.name.trim(), draft.category, user.id);
      setTags((current) => [...current, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setDraft(emptyDraft);
    } catch (err) {
      console.error(err);
      setError("Unable to create this tag. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (tag: Tag): void => {
    setEditingId(tag.id);
    setEditingDraft({ name: tag.name, category: tag.category });
    setError(null);
  };

  const handleUpdate = async (id: string): Promise<void> => {
    const validationError = validateDraft(editingDraft);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateTag(id, editingDraft.name.trim(), editingDraft.category);
      setTags((current) =>
        current
          .map((tag) => (tag.id === id ? { ...tag, name: editingDraft.name.trim(), category: editingDraft.category } : tag))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setEditingId(null);
    } catch (err) {
      console.error(err);
      setError("Unable to update this tag. You may not have permission to edit this tag.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: Tag): Promise<void> => {
    if (!window.confirm(`Delete the tag “${tag.name}”?`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteTag(tag.id);
      setTags((current) => current.filter((item) => item.id !== tag.id));
    } catch (err) {
      console.error(err);
      setError("Unable to delete this tag. You may not have permission to delete this tag.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !canManageTags) return null;

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-teal-700">Content settings</p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Tag management</h1>
        <p className="mt-2 max-w-2xl text-stone-500">Create and maintain the tags used to organise department content.</p>
      </div>

      {error && <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleCreate} className="mb-8 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-stone-900">Add a tag</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm font-medium text-stone-700">
            Name
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Year 2" />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-stone-700">
            Category
            <select
              value={draft.category ?? ""}
              onChange={(event) => setDraft({ ...draft, category: (event.target.value || null) as TagCategory | null })}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Uncategorised</option>
              {CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
            </select>
          </label>
          <Button type="submit" disabled={saving}><Plus /> Add tag</Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-5 py-4">
          <h2 className="font-semibold text-stone-900">Existing tags <span className="font-normal text-stone-500">({tags.length})</span></h2>
        </div>
        {tags.length === 0 ? (
          <p className="px-5 py-8 text-sm text-stone-500">No tags have been created yet.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {tags.map((tag) => (
              <li key={tag.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                {editingId === tag.id ? (
                  <div className="grid min-w-[240px] flex-1 gap-3 sm:grid-cols-[1fr_160px]">
                    <Input value={editingDraft.name} onChange={(event) => setEditingDraft({ ...editingDraft, name: event.target.value })} />
                    <select
                      value={editingDraft.category ?? ""}
                      onChange={(event) => setEditingDraft({ ...editingDraft, category: (event.target.value || null) as TagCategory | null })}
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Uncategorised</option>
                      {CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="flex min-w-[240px] flex-1 items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${colorForTag(tag)}`}>{tag.name}</span>
                    <span className="text-sm text-stone-500">{CATEGORIES.find((category) => category.value === tag.category)?.label ?? "Uncategorised"}</span>
                  </div>
                )}
                <div className="ml-auto flex items-center gap-1">
                  {editingId === tag.id ? (
                    <>
                      <Button type="button" size="sm" onClick={() => handleUpdate(tag.id)} disabled={saving}><Save /> Save</Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => setEditingId(null)} aria-label="Cancel editing"><X /></Button>
                    </>
                  ) : (
                    <>
                      <Button type="button" size="icon" variant="ghost" onClick={() => startEditing(tag)} aria-label={`Edit ${tag.name}`}><Pencil /></Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => handleDelete(tag)} aria-label={`Delete ${tag.name}`}><Trash2 /></Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}