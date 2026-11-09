"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "@/src/i18n/navigation";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { colorForTag, createTag, deleteTag, fetchTags, subscribeToTags, Tag, TagCategory, updateTag } from "@/src/lib/tags";
import { useRole } from "@/src/components/role-context";

const CATEGORIES: { value: TagCategory; labelKey: string }[] = [
  { value: "year", labelKey: "filters.groups.year" },
  { value: "course", labelKey: "filters.groups.course" },
  { value: "activity", labelKey: "filters.groups.activity" },
];

type TagDraft = { name: string; category: TagCategory | null };

const emptyDraft: TagDraft = { name: "", category: null };

export default function TagsPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user, role, loading } = useRole();
  const [tags, setTags] = useState<Tag[]>([]);
  const [draft, setDraft] = useState<TagDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<TagDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Tag management is accessible only to the admin role (SRS US-14 / SRS-11 / AD-5)
  const canManageTags = role === "admin";

  useEffect(() => {
    if (!loading && !canManageTags) router.replace("/");
  }, [canManageTags, loading, router]);

  useEffect(() => {
    if (!canManageTags) return;
    const loadTags = (): void => {
      fetchTags().then(setTags).catch(() => setError(t("tags.errors.load")));
    };
    loadTags();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const scheduleReload = (): void => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(loadTags, 200);
    };
    const unsubscribe = subscribeToTags(scheduleReload);
    return () => {
      if (timeout) clearTimeout(timeout);
      unsubscribe();
    };
  }, [canManageTags, t]);

  const categoryLabel = (category: TagCategory | null): string => {
    const match = CATEGORIES.find((item) => item.value === category);
    return match ? t(match.labelKey) : t("tags.uncategorised");
  };

  // US-14: a tag requires a non-empty, unique name. `ignoreId` excludes the
  // tag being edited from the uniqueness check.
  const validateDraft = (value: TagDraft, ignoreId?: string): string | null => {
    const name = value.name.trim();
    if (!name) return t("tags.errors.nameRequired");
    if (name.length > 80) return t("tags.errors.nameTooLong");
    if (tags.some((tag) => tag.id !== ignoreId && tag.name.trim().toLowerCase() === name.toLowerCase())) {
      return t("tags.errors.nameDuplicate");
    }
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
      setError(t("tags.errors.create"));
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
    const validationError = validateDraft(editingDraft, id);
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
      setError(t("tags.errors.update"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag: Tag): Promise<void> => {
    if (!window.confirm(t("tags.confirmDelete", { name: tag.name }))) return;
    setSaving(true);
    setError(null);
    try {
      await deleteTag(tag.id);
      setTags((current) => current.filter((item) => item.id !== tag.id));
    } catch (err) {
      console.error(err);
      setError(t("tags.errors.delete"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !canManageTags) return null;

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-teal-700">{t("tags.eyebrow")}</p>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">{t("tags.heading")}</h1>
        <p className="mt-2 max-w-2xl text-stone-500">{t("tags.description")}</p>
      </div>

      {error && <p className="mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={handleCreate} className="mb-8 rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-stone-900">{t("tags.add.heading")}</h2>
        <div className="grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <label className="grid gap-1.5 text-sm font-medium text-stone-700">
            {t("tags.fields.name")}
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder={t("tags.fields.namePlaceholder")} />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-stone-700">
            {t("tags.fields.category")}
            <select
              value={draft.category ?? ""}
              onChange={(event) => setDraft({ ...draft, category: (event.target.value || null) as TagCategory | null })}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("tags.uncategorised")}</option>
              {CATEGORIES.map((category) => <option key={category.value} value={category.value}>{t(category.labelKey)}</option>)}
            </select>
          </label>
          <Button type="submit" disabled={saving}><Plus /> {t("tags.add.submit")}</Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-5 py-4">
          <h2 className="font-semibold text-stone-900">{t("tags.list.heading")} <span className="font-normal text-stone-500">({tags.length})</span></h2>
        </div>
        {tags.length === 0 ? (
          <p className="px-5 py-8 text-sm text-stone-500">{t("tags.list.empty")}</p>
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
                      <option value="">{t("tags.uncategorised")}</option>
                      {CATEGORIES.map((category) => <option key={category.value} value={category.value}>{t(category.labelKey)}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="flex min-w-[240px] flex-1 items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-sm font-medium ${colorForTag(tag)}`}>{tag.name}</span>
                    <span className="text-sm text-stone-500">{categoryLabel(tag.category)}</span>
                  </div>
                )}
                <div className="ml-auto flex items-center gap-1">
                  {editingId === tag.id ? (
                    <>
                      <Button type="button" size="sm" onClick={() => handleUpdate(tag.id)} disabled={saving}><Save /> {t("tags.actions.save")}</Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => setEditingId(null)} aria-label={t("tags.actions.cancelEditing")}><X /></Button>
                    </>
                  ) : (
                    <>
                      <Button type="button" size="icon" variant="ghost" onClick={() => startEditing(tag)} aria-label={t("tags.actions.editAriaLabel", { name: tag.name })}><Pencil /></Button>
                      <Button type="button" size="icon" variant="ghost" onClick={() => handleDelete(tag)} aria-label={t("tags.actions.deleteAriaLabel", { name: tag.name })}><Trash2 /></Button>
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
