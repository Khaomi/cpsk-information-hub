import { createClient } from "@/src/lib/supabase/client";
import type { Tables } from "@/types/database.types";
import type { ContactFormValues } from "@/src/components/contact-form";
import type { Tag } from "@/src/lib/tags";

export type ContactStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type ContactRoleType = "LECTURER" | "TA";

export type Contact = {
  id: string;
  name: string;
  roleType: ContactRoleType;
  email: string | null;
  building: string | null;
  room: string | null;
  otherContact: string | null;
  bio: string | null;
  status: ContactStatus;
  creatorId: string;
  tags: Tag[];
  imageUrl: string | null;
};

type ContactViewRow = Tables<"contact_with_details">;
type SupabaseClient = ReturnType<typeof createClient>;

const CONTACT_IMAGES_BUCKET = "contact-images";

function extractStoragePath(url: string): string | null {
  const marker = `/${CONTACT_IMAGES_BUCKET}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

async function attachRelations(supabase: SupabaseClient, rows: ContactViewRow[]): Promise<Contact[]> {
  const ids = rows.map((r) => r.id).filter((id): id is string => id !== null);
  const tagsByContact = new Map<string, Tag[]>();
  const imageByContact = new Map<string, string>();

  if (ids.length > 0) {
    const [{ data: tagLinks, error: tagError }, { data: imageLinks, error: imageError }] = await Promise.all([
      supabase
        .from("contact_tag")
        .select("contact_id, tag:tag(id, name, category)")
        .in("contact_id", ids),
      supabase
        .from("contact_attachment")
        .select("contact_id, attachment:attachment(url)")
        .in("contact_id", ids),
    ]);
    if (tagError) throw tagError;
    if (imageError) throw imageError;

    for (const link of tagLinks ?? []) {
      if (!link.tag) continue;
      const list = tagsByContact.get(link.contact_id) ?? [];
      list.push(link.tag);
      tagsByContact.set(link.contact_id, list);
    }

    for (const link of imageLinks ?? []) {
      if (!link.attachment || imageByContact.has(link.contact_id)) continue;
      imageByContact.set(link.contact_id, link.attachment.url);
    }
  }

  return rows.map((row) => ({
    id: row.id as string,
    name: row.name ?? "",
    roleType: (row.role_type ?? "LECTURER") as ContactRoleType,
    email: row.email ?? null,
    building: row.building ?? null,
    room: row.room ?? null,
    otherContact: row.other_contact ?? null,
    bio: row.bio ?? null,
    status: (row.status ?? "DRAFT") as ContactStatus,
    creatorId: row.creator_id as string,
    tags: tagsByContact.get(row.id as string) ?? [],
    imageUrl: imageByContact.get(row.id as string) ?? null,
  }));
}

export async function fetchContacts(): Promise<Contact[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contact_with_details")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return attachRelations(supabase, data ?? []);
}

export async function fetchContactById(id: string): Promise<Contact | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contact_with_details")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [result] = await attachRelations(supabase, [data]);
  return result;
}

async function uploadContactImage(supabase: SupabaseClient, file: File, creatorId: string): Promise<string> {
  const ext = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  const path = `${creatorId}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;

  const { error: uploadError } = await supabase.storage.from(CONTACT_IMAGES_BUCKET).upload(path, file);
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(CONTACT_IMAGES_BUCKET).getPublicUrl(path);

  const { data, error } = await supabase
    .from("attachment")
    .insert({ creator_id: creatorId, filename: file.name, filesize: file.size, url: publicUrl })
    .select("id")
    .single();
  if (error) throw error;

  return data.id as string;
}

async function clearContactImage(supabase: SupabaseClient, contactId: string): Promise<void> {
  const { data: links, error } = await supabase
    .from("contact_attachment")
    .select("attachment_id, attachment:attachment(url)")
    .eq("contact_id", contactId);
  if (error) throw error;
  if (!links || links.length === 0) return;

  const { error: unlinkError } = await supabase
    .from("contact_attachment")
    .delete()
    .eq("contact_id", contactId);
  if (unlinkError) throw unlinkError;

  for (const link of links) {
    const path = link.attachment ? extractStoragePath(link.attachment.url) : null;
    if (path) {
      await supabase.storage.from(CONTACT_IMAGES_BUCKET).remove([path]);
    }
    await supabase.from("attachment").delete().eq("id", link.attachment_id);
  }
}

async function syncTags(supabase: SupabaseClient, contactId: string, tagIds: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from("contact_tag")
    .delete()
    .eq("contact_id", contactId);
  if (deleteError) throw deleteError;

  if (tagIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("contact_tag")
    .insert(tagIds.map((tagId) => ({ contact_id: contactId, tag_id: tagId })));
  if (insertError) throw insertError;
}

export async function insertContact(
  values: ContactFormValues,
  status: "draft" | "published",
  creatorId: string,
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contact")
    .insert({
      name: values.name,
      role_type: values.roleType,
      email: values.email || null,
      building: values.building || null,
      room: values.room || null,
      other_contact: values.otherContact || null,
      bio: values.bio || null,
      status: status === "published" ? "ACTIVE" : "DRAFT",
      creator_id: creatorId,
    })
    .select("id")
    .single();
  if (error) throw error;

  await syncTags(supabase, data.id, values.tagIds);

  if (values.imageFile) {
    const attachmentId = await uploadContactImage(supabase, values.imageFile, creatorId);
    const { error: linkError } = await supabase
      .from("contact_attachment")
      .insert({ contact_id: data.id, attachment_id: attachmentId });
    if (linkError) throw linkError;
  }

  return data.id;
}

export async function updateContact(
  id: string,
  values: ContactFormValues,
  status: "draft" | "published",
  editorId: string,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("contact")
    .update({
      name: values.name,
      role_type: values.roleType,
      email: values.email || null,
      building: values.building || null,
      room: values.room || null,
      other_contact: values.otherContact || null,
      bio: values.bio || null,
      status: status === "published" ? "ACTIVE" : "DRAFT",
    })
    .eq("id", id);
  if (error) throw error;

  await syncTags(supabase, id, values.tagIds);

  if (values.removeImage || values.imageFile) {
    await clearContactImage(supabase, id);
  }

  if (values.imageFile) {
    const attachmentId = await uploadContactImage(supabase, values.imageFile, editorId);
    const { error: linkError } = await supabase
      .from("contact_attachment")
      .insert({ contact_id: id, attachment_id: attachmentId });
    if (linkError) throw linkError;
  }
}

export async function setContactActive(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("contact")
    .update({ status: "ACTIVE" })
    .eq("id", id);
  if (error) throw error;
}

export async function setContactArchived(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("contact")
    .update({ status: "ARCHIVED" })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteContact(id: string): Promise<void> {
  const supabase = createClient();
  await clearContactImage(supabase, id);
  const { error } = await supabase.from("contact").delete().eq("id", id);
  if (error) throw error;
}

type Unsubscribe = () => void;

export function subscribeToContacts(onChange: () => void): Unsubscribe {
  const supabase = createClient();
  const channel = supabase
    .channel("contacts-list-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "contact" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "contact_tag" }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToContact(id: string, onChange: () => void): Unsubscribe {
  const supabase = createClient();
  const channel = supabase
    .channel(`contact-${id}-changes`)
    .on("postgres_changes", { event: "*", schema: "public", table: "contact", filter: `id=eq.${id}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "contact_tag", filter: `contact_id=eq.${id}` }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}