// Stage 5: Export completed shots to Google Drive (developer-owned).
// All exports land in the workspace owner's Drive — see plan.md Stage 5.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";

type PlannedShot = {
  id: string;
  intent?: string;
  status: string;
  outputUrl?: string;
};

type Plan = { shots: PlannedShot[] };

type DriveFile = { id: string; name: string; webViewLink?: string };

async function driveFetch(path: string, init: RequestInit = {}) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const driveKey = Deno.env.get("GOOGLE_DRIVE_API_KEY");
  if (!lovableKey) throw new Error("LOVABLE_API_KEY missing");
  if (!driveKey) throw new Error("GOOGLE_DRIVE_API_KEY missing");
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": driveKey,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive ${res.status}: ${body.slice(0, 300)}`);
  }
  return res;
}

async function createFolder(name: string): Promise<DriveFile> {
  const res = await driveFetch(
    "/drive/v3/files?fields=id,name,webViewLink",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
      }),
    },
  );
  return await res.json();
}

async function uploadVideo(
  folderId: string,
  fileName: string,
  videoUrl: string,
): Promise<DriveFile> {
  // Stream from the public URL, then multipart-upload to Drive via gateway.
  const src = await fetch(videoUrl);
  if (!src.ok) throw new Error(`source fetch ${src.status}`);
  const bytes = new Uint8Array(await src.arrayBuffer());
  const contentType = src.headers.get("content-type") ?? "video/mp4";

  const boundary = `lvbl${crypto.randomUUID().replace(/-/g, "")}`;
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });
  const encoder = new TextEncoder();
  const head = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`,
  );
  const tail = encoder.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.length + bytes.length + tail.length);
  body.set(head, 0);
  body.set(bytes, head.length);
  body.set(tail, head.length + bytes.length);

  const res = await driveFetch(
    "/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  return await res.json();
}

function safeName(s: string, max = 60) {
  return (s || "shot").replace(/[\\/:*?"<>|]+/g, " ").trim().slice(0, max) || "shot";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { session_id } = await req.json();
    if (typeof session_id !== "string" || !session_id) {
      return new Response(JSON.stringify({ error: "session_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session, error } = await supabase
      .from("director_sessions")
      .select("id,title,plan,user_id")
      .eq("id", session_id)
      .maybeSingle();
    if (error || !session) throw new Error("session not found");
    if (session.user_id !== userId) throw new Error("forbidden");

    const plan = (session.plan ?? { shots: [] }) as Plan;
    const completed = (plan.shots ?? []).filter(
      (s) => s.status === "done" && typeof s.outputUrl === "string" && s.outputUrl,
    );
    if (completed.length === 0) {
      return new Response(JSON.stringify({ error: "no completed shots to export" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const folderName = `VidoPrompt — ${safeName(session.title ?? "Session")} — ${new Date()
      .toISOString()
      .slice(0, 10)}`;
    const folder = await createFolder(folderName);

    const uploaded: { shotId: string; file: DriveFile }[] = [];
    const failed: { shotId: string; error: string }[] = [];

    // Sequential to stay friendly with Drive quotas and gateway concurrency.
    for (let i = 0; i < completed.length; i++) {
      const shot = completed[i];
      const name = `${String(i + 1).padStart(2, "0")} — ${safeName(shot.intent ?? "shot")}.mp4`;
      try {
        const file = await uploadVideo(folder.id, name, shot.outputUrl!);
        uploaded.push({ shotId: shot.id, file });
      } catch (e) {
        failed.push({
          shotId: shot.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return new Response(
      JSON.stringify({
        folder: {
          id: folder.id,
          name: folder.name,
          url:
            folder.webViewLink ??
            `https://drive.google.com/drive/folders/${folder.id}`,
        },
        uploaded_count: uploaded.length,
        failed_count: failed.length,
        failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
