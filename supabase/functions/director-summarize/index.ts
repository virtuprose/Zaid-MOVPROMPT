// Background summarizer for AI Director chats.
// Folds older messages into a compact session summary stored on
// director_sessions.brief_context.summary, and rolls a long-term
// user memory row in director_user_memory. Fire-and-forget from director-agent.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const KEEP_RECENT = 20;
const MAX_SUMMARY_CHARS = 4000;
const MAX_USER_MEMORY_CHARS = 2000;

type Msg = { role: "user" | "assistant"; content: string };

async function gemini(prompt: string, system: string): Promise<string> {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY,
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`gateway ${resp.status}: ${t.slice(0, 300)}`);
  }
  const j = await resp.json();
  return (j.choices?.[0]?.message?.content || "").toString().trim();
}

function flatten(messages: Msg[], maxChars = 8000): string {
  const lines: string[] = [];
  for (const m of messages) {
    const role = m.role === "user" ? "USER" : "DIRECTOR";
    const content = (m.content || "").toString().slice(0, 1200);
    lines.push(`${role}: ${content}`);
  }
  const text = lines.join("\n");
  return text.length > maxChars ? text.slice(-maxChars) : text;
}

const SESSION_SUMMARY_SYSTEM = `You are a compact note-taker for an AI Director chat. Produce a structured Markdown digest the Director can re-read on every future turn so it remembers the whole chat without seeing the raw messages.

Output sections (omit any that are empty, never invent data):
- **Brief & intent**: one or two sentences on what the user is making.
- **Pinned subjects**: characters, products, brands the user locked, with the reference URL if known.
- **Uploaded references**: each image / video / doc the user dropped, with a short caption.
- **Locked spec**: model, aspect, duration, audio, resolution, style — whatever was decided.
- **Story / shots so far**: one bullet per beat or rendered shot.
- **Open decisions**: what the user has NOT answered yet.
- **Last clarification answered**: the most recent question + the user's answer, verbatim.

Hard rules:
- Be terse. No filler. No emoji. Markdown only.
- Quote exact URLs when known. Never paraphrase a URL.
- Keep the whole digest under 3500 characters.`;

const USER_MEMORY_SYSTEM = `You maintain a long-term memory profile for one MovPrompt user across many AI Director sessions. Merge the user's existing memory with a fresh session digest and return updated memory as Markdown.

Output sections (omit empty ones):
- **About**: durable traits (recurring genre, languages, brand vibe).
- **Recurring subjects**: characters / brands / products the user reuses (name + 1-line description + last reference URL).
- **Style defaults**: aspect, duration, audio, model picks they keep choosing.
- **Recent sessions**: bullet list, newest first, max 8 — format \`- <session title> — <one-line recap>\`.

Hard rules:
- Replace stale entries; do not duplicate.
- Drop oldest entries once "Recent sessions" exceeds 8 bullets.
- Keep the whole profile under 1800 characters. Be terse. No emoji.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const sessionId: string | undefined = body.sessionId;
    const userId: string | undefined = body.userId;
    const messages: Msg[] = Array.isArray(body.messages) ? body.messages : [];

    if (!sessionId || !userId) {
      return new Response(JSON.stringify({ error: "sessionId and userId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (messages.length <= KEEP_RECENT) {
      return new Response(JSON.stringify({ skipped: "history below threshold" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // Verify ownership.
    const { data: sess } = await admin
      .from("director_sessions")
      .select("id, user_id, title, brief_context")
      .eq("id", sessionId)
      .maybeSingle();
    if (!sess || sess.user_id !== userId) {
      return new Response(JSON.stringify({ error: "session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const briefContext = (sess.brief_context as Record<string, unknown>) || {};
    const previousSummary =
      typeof briefContext.summary === "string" ? (briefContext.summary as string) : "";

    // Summarize everything except the last KEEP_RECENT raw turns.
    const older = messages.slice(0, messages.length - KEEP_RECENT);
    const flat = flatten(older);

    const prompt = `${
      previousSummary
        ? `Previous digest of this session (refresh and extend with the new turns below):\n"""${previousSummary}"""\n\n`
        : ""
    }Newly evicted chat turns (oldest first):\n"""${flat}"""\n\nReturn the updated digest now.`;

    let newSummary = "";
    try {
      newSummary = (await gemini(prompt, SESSION_SUMMARY_SYSTEM)).slice(0, MAX_SUMMARY_CHARS);
    } catch (e) {
      console.error("session summary failed", e);
      // Don't fail the request — leave previous summary in place.
      return new Response(JSON.stringify({ error: "summary failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("director_sessions")
      .update({
        brief_context: { ...briefContext, summary: newSummary },
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    // Roll the long-term user memory using THIS session's digest.
    const { data: memRow } = await admin
      .from("director_user_memory")
      .select("memory")
      .eq("user_id", userId)
      .maybeSingle();

    const previousMemory =
      memRow && typeof (memRow.memory as Record<string, unknown>)?.text === "string"
        ? ((memRow.memory as Record<string, unknown>).text as string)
        : "";

    const memPrompt = `Existing long-term memory for this user (may be empty):\n"""${previousMemory || "(none)"}"""\n\nFresh digest from session "${sess.title || "untitled"}":\n"""${newSummary}"""\n\nReturn the updated long-term memory now.`;

    let newMemory = "";
    try {
      newMemory = (await gemini(memPrompt, USER_MEMORY_SYSTEM)).slice(
        0,
        MAX_USER_MEMORY_CHARS,
      );
    } catch (e) {
      console.error("user memory refresh failed", e);
    }

    if (newMemory) {
      await admin
        .from("director_user_memory")
        .upsert(
          { user_id: userId, memory: { text: newMemory }, updated_at: new Date().toISOString() },
          { onConflict: "user_id" },
        );
    }

    return new Response(
      JSON.stringify({ ok: true, summaryChars: newSummary.length, memoryChars: newMemory.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("director-summarize error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
