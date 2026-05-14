// Client-side ingestion utilities for the AI Director.
// Converts uploads into normalized Attachment payloads the edge fn understands.

import { supabase } from "@/integrations/supabase/client";

export type Attachment =
  | { kind: "image"; name: string; url: string }
  | { kind: "video_keyframes"; name: string; url: string } // single keyframe per attachment chip
  | { kind: "audio_transcript"; name: string; text: string }
  | { kind: "document"; name: string; text: string };

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
const MAX_DOC_BYTES = 10 * 1024 * 1024;

async function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export async function ingestImage(file: File): Promise<Attachment> {
  if (file.size > MAX_IMAGE_BYTES) throw new Error(`${file.name} is over 4MB`);
  const url = await fileToDataUrl(file);
  return { kind: "image", name: file.name, url };
}

// Extract N keyframes evenly spaced across the video, return as image attachments
export async function ingestVideo(file: File, frameCount = 3): Promise<Attachment[]> {
  if (file.size > MAX_VIDEO_BYTES) throw new Error(`${file.name} is over 30MB`);
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

    const frames: Attachment[] = [];
    for (let i = 0; i < frameCount; i++) {
      const t = (duration * (i + 1)) / (frameCount + 1);
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
        video.currentTime = t;
      });
      ctx.drawImage(video, 0, 0, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
      frames.push({
        kind: "video_keyframes",
        name: `${file.name} · frame ${i + 1}/${frameCount}`,
        url: dataUrl,
      });
    }
    return frames;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

// Audio: upload to bucket, return a placeholder text reference (transcription deferred)
export async function ingestAudio(file: File, userId: string): Promise<Attachment> {
  if (file.size > 25 * 1024 * 1024) throw new Error(`${file.name} is over 25MB`);
  const path = `${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("director-uploads").upload(path, file);
  if (error) throw error;
  return {
    kind: "audio_transcript",
    name: file.name,
    text: `[Audio brief attached: ${file.name}. Transcription will be available in a future update — please add any spoken intent as text in the chat for now.]`,
  };
}

// Read TXT / MD directly
async function readText(file: File): Promise<string> {
  return await file.text();
}

// PDF parsing via pdfjs-dist (lazy import — keeps bundle smaller)
async function readPdf(file: File): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist");
  // Worker via CDN to avoid bundler config
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

// DOCX parsing via mammoth
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

export function classifyFile(file: File): "image" | "video" | "audio" | "document" | "unknown" {
  const t = file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  if (t.startsWith("audio/")) return "audio";
  if (["pdf", "docx", "txt", "md"].includes(ext)) return "document";
  return "unknown";
}
