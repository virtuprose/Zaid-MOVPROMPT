// Client-side ingestion utilities for the AI Director.
// Uploads to the private `director-uploads` bucket and returns short-lived signed URLs.

import { supabase } from "@/integrations/supabase/client";

export type Attachment =
  | { kind: "image"; name: string; url: string; storage_path?: string }
  | { kind: "video_keyframes"; name: string; url: string; storage_path?: string }
  | { kind: "audio_transcript"; name: string; text: string; storage_path?: string }
  | { kind: "document"; name: string; text: string };

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_DOC_BYTES = 10 * 1024 * 1024;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const SIGNED_URL_TTL = 60 * 60; // 1 hour

async function uploadAndSign(
  blob: Blob,
  userId: string,
  fileName: string,
  contentType: string,
): Promise<{ storage_path: string; url: string }> {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safe}`;
  const { error } = await supabase.storage
    .from("director-uploads")
    .upload(path, blob, { contentType, upsert: false });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage
    .from("director-uploads")
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (signErr || !data?.signedUrl) throw signErr || new Error("Could not sign URL");
  return { storage_path: path, url: data.signedUrl };
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sign in to attach references");
  return data.user.id;
}

export async function ingestImage(file: File): Promise<Attachment> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} is over 8MB`);
  const uid = await requireUserId();
  const { storage_path, url } = await uploadAndSign(file, uid, file.name, file.type || "image/jpeg");
  return { kind: "image", name: file.name, url, storage_path };
}

export async function ingestVideo(file: File, frameCount = 3): Promise<Attachment[]> {
  if (file.size > MAX_VIDEO_BYTES) throw new Error(`${file.name} is over 50MB`);
  const uid = await requireUserId();
  const blobUrl = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.src = blobUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Could not read video"));
    });

    const duration = video.duration || 0;
    if (!duration || !isFinite(duration)) throw new Error("Invalid video duration");

    const w = Math.min(960, video.videoWidth || 640);
    const h = Math.round((video.videoHeight || 360) * (w / (video.videoWidth || 640)));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    // Extract frames sequentially (canvas is shared), then upload in parallel.
    const blobs: { blob: Blob; name: string; label: string }[] = [];
    for (let i = 0; i < frameCount; i++) {
      const t = (duration * (i + 1)) / (frameCount + 1);
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = t;
      });
      ctx.drawImage(video, 0, 0, w, h);
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Could not encode frame"))),
          "image/jpeg",
          0.85,
        ),
      );
      blobs.push({
        blob,
        name: `${file.name}.frame-${i + 1}.jpg`,
        label: `${file.name} · frame ${i + 1}/${frameCount}`,
      });
    }
    const frames: Attachment[] = await Promise.all(
      blobs.map(async ({ blob, name, label }) => {
        const { storage_path, url } = await uploadAndSign(blob, uid, name, "image/jpeg");
        return { kind: "video_keyframes", name: label, url, storage_path } as Attachment;
      }),
    );
    return frames;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export async function ingestAudio(file: File, userId: string): Promise<Attachment> {
  if (file.size > MAX_AUDIO_BYTES) throw new Error(`${file.name} is over 25MB`);
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safe}`;
  const { error } = await supabase.storage.from("director-uploads").upload(path, file, {
    contentType: file.type || "audio/mpeg",
  });
  if (error) throw error;

  // Try real transcription; fall back to placeholder if it fails
  let text = `[Audio brief attached: ${file.name}. Transcription unavailable — please add intent as text.]`;
  try {
    const { data, error: fnErr } = await supabase.functions.invoke("transcribe-audio", {
      body: { storage_path: path },
    });
    if (!fnErr && data?.transcript) text = data.transcript;
  } catch (e) {
    console.warn("transcription failed, using placeholder", e);
  }

  return { kind: "audio_transcript", name: file.name, text, storage_path: path };
}

async function readText(file: File): Promise<string> {
  return await file.text();
}

async function readPdf(file: File): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  const max = Math.min(doc.numPages, 30);
  for (let i = 1; i <= max; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((it: any) => it.str).join(" "));
  }
  return pages.join("\n\n");
}

async function readDocx(file: File): Promise<string> {
  const mammoth: any = await import("mammoth/mammoth.browser");
  const buf = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  return (res.value || "").trim();
}

export async function ingestDocument(file: File): Promise<Attachment> {
  if (file.size > MAX_DOC_BYTES) throw new Error(`${file.name} is over 10MB`);
  const ext = file.name.split(".").pop()?.toLowerCase();
  let text = "";
  if (ext === "pdf") text = await readPdf(file);
  else if (ext === "docx") text = await readDocx(file);
  else if (ext === "txt" || ext === "md") text = await readText(file);
  else throw new Error(`Unsupported document type: .${ext}`);
  text = text.trim().slice(0, 12000);
  if (!text) throw new Error(`No text could be extracted from ${file.name}`);
  return { kind: "document", name: file.name, text };
}

// Refresh a signed URL when loading an old session whose URL has expired.
export async function refreshSignedUrl(storage_path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from("director-uploads")
    .createSignedUrl(storage_path, SIGNED_URL_TTL);
  return data?.signedUrl || null;
}

export function classifyFile(file: File): "image" | "video" | "audio" | "document" | "unknown" {
  const t = file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("audio/")) return "audio";
  if (["pdf", "docx", "txt", "md"].includes(ext)) return "document";
  return "unknown";
}
