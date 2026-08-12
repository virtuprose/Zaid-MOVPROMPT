import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { CreatorProject } from "./types";

const STORAGE_KEY = "movprompt.creator-projects.v2";
const CHANGE_EVENT = "movprompt:creator-projects-changed";

function storageKey(userId?: string | null) {
  return `${STORAGE_KEY}:${userId || "signed-out"}`;
}

function readLocal(userId?: string | null): CreatorProject[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(projects: CreatorProject[], userId?: string | null) {
  localStorage.setItem(storageKey(userId), JSON.stringify(projects.slice(0, 24)));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function listLocalCreatorProjects(userId?: string | null) {
  return readLocal(userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getLocalCreatorProject(id: string, userId?: string | null) {
  return readLocal(userId).find((project) => project.id === id) ?? null;
}

export function saveLocalCreatorProject(project: CreatorProject, userId?: string | null) {
  const next = { ...project, updatedAt: new Date().toISOString() };
  const projects = readLocal(userId).filter((item) => item.id !== next.id);
  writeLocal([next, ...projects], userId);
  return next;
}

export function deleteLocalCreatorProject(id: string, userId?: string | null) {
  writeLocal(readLocal(userId).filter((project) => project.id !== id), userId);
}

export function subscribeToCreatorProjects(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export async function syncCreatorProject(project: CreatorProject, userId?: string | null) {
  const saved = saveLocalCreatorProject(project, userId);
  if (!userId) return saved;

  const { error } = await supabase.from("creator_projects").upsert({
    id: saved.id,
    user_id: userId,
    title: saved.title,
    mode: "template",
    status: saved.status,
    updated_at: saved.updatedAt,
  });

  if (!error) {
    const versionId = saved.versionId || crypto.randomUUID();
    const { error: versionError } = await supabase.from("creator_project_versions").upsert({
      id: versionId,
      project_id: saved.id,
      user_id: userId,
      template_version_id: null,
      mode: "template",
      version_number: saved.versionNumber || 1,
      configuration: { ...saved, versionId } as unknown as Json,
      product_recipe: saved.product as unknown as Json,
      campaign_recipe: { market: saved.market, language: saved.language, offer: saved.offer, cta: saved.cta, aspectRatio: saved.aspectRatio, resolution: saved.resolution } as unknown as Json,
    });
    if (!versionError) await supabase.from("creator_projects").update({ current_accepted_version_id: versionId }).eq("id", saved.id).eq("user_id", userId);
  }

  if (error) {
    console.warn("Creator project cloud sync failed", error.message);
  }
  return saved;
}

export async function loadCreatorProjects(userId?: string | null) {
  const local = listLocalCreatorProjects(userId);
  if (!userId) return local;

  const { data, error } = await supabase
    .from("creator_projects")
    .select("id,updated_at,current_accepted_version_id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error || !data) return local;
  const versionIds = data.flatMap((row) => row.current_accepted_version_id ? [row.current_accepted_version_id] : []);
  const { data: versions } = versionIds.length ? await supabase.from("creator_project_versions").select("id,configuration").in("id", versionIds) : { data: [] };
  const versionMap = new Map((versions || []).map((row) => [row.id, row.configuration as unknown as CreatorProject]));
  const cloud = data.flatMap((row) => {
    const project = row.current_accepted_version_id ? versionMap.get(row.current_accepted_version_id) : null;
    return project ? [{ ...project, updatedAt: row.updated_at }] : [];
  });
  const merged = new Map<string, CreatorProject>();
  [...local, ...cloud].forEach((project) => {
    const current = merged.get(project.id);
    if (!current || project.updatedAt > current.updatedAt) merged.set(project.id, project);
  });
  const result = Array.from(merged.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  writeLocal(result, userId);
  return result;
}
