import { supabase } from "@/integrations/supabase/client";
import type { Attachment } from "./ingest";

export type DirectorMsg = { role: "user" | "assistant"; content: string };

export type Breakdown = {
  subject?: string;
  action?: string;
  camera?: string;
  lighting?: string;
  mood?: string;
  color_palette?: string;
  environment?: string;
  duration_hint?: string;
  film_emulation?: string;
  negative_prompt?: string;
  model_recommendation?: string;
};

export type AgentResponse =
  | { kind: "ask_clarification"; questions: string[]; reason: string }
  | {
      kind: "generate_prompt";
      title: string;
      prompt: string;
      breakdown: Breakdown;
      directors_note?: string;
    }
  | {
      kind: "request_video_generation";
      prompt: string;
      provider_preference?: "seedance" | "veo" | "kling" | "any";
    }
  | { kind: "message"; content: string };

const ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/director-agent`;

export async function callDirectorAgent(
  messages: DirectorMsg[],
  attachments: Attachment[],
): Promise<AgentResponse> {
  const { data, error } = await supabase.functions.invoke("director-agent", {
    body: { messages, attachments },
  });
  if (error) throw error;
  return data as AgentResponse;
}

/**
 * Streams the agent response. Calls `onPartial` with a progressively-built
 * AgentResponse whenever new tool-argument JSON has accumulated enough to
 * be parseable. Resolves with the final response.
 *
 * NOTE: tool-call argument deltas often arrive as fragments of JSON; we
 * tolerate parse failures and only emit partials when JSON.parse succeeds
 * on the (loosely closed) accumulator.
 */
export async function streamDirectorAgent(
  messages: DirectorMsg[],
  attachments: Attachment[],
  onPartial: (partial: AgentResponse) => void,
  signal?: AbortSignal,
): Promise<AgentResponse> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ messages, attachments, stream: true }),
    signal,
  });

  if (!resp.ok || !resp.body) {
    let msg = "Director request failed";
    try {
      const j = await resp.json();
      msg = j.error || msg;
    } catch {
      /* ignore */
    }
    if (resp.status === 429) throw new Error("Too many requests — wait a moment and try again.");
    if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace → Usage.");
    throw new Error(msg);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let toolName = "";
  let toolArgs = "";
  let textContent = "";
  let done = false;

  const tryEmitPartial = () => {
    if (!toolName || !toolArgs) return;
    // Try to parse what we have so far. JSON.parse on a half-emitted object
    // fails — so only fire when the brace count balances.
    let depth = 0;
    let inString = false;
    let escape = false;
    for (const ch of toolArgs) {
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
    }
    if (depth !== 0) return;
    try {
      const parsed = JSON.parse(toolArgs);
      onPartial({ kind: toolName as any, ...parsed });
    } catch {
      /* ignore */
    }
  };

  while (!done) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line || line.startsWith(":")) continue;
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") {
        done = true;
        break;
      }
      try {
        const j = JSON.parse(payload);
        const delta = j.choices?.[0]?.delta;
        if (!delta) continue;
        if (delta.tool_calls?.[0]) {
          const tc = delta.tool_calls[0];
          if (tc.function?.name) toolName = tc.function.name;
          if (tc.function?.arguments) {
            toolArgs += tc.function.arguments;
            tryEmitPartial();
          }
        } else if (delta.content) {
          textContent += delta.content;
        }
      } catch {
        // partial JSON across chunk boundary — re-buffer
        buf = line + "\n" + buf;
        break;
      }
    }
  }

  if (toolName) {
    try {
      const parsed = JSON.parse(toolArgs || "{}");
      return { kind: toolName as any, ...parsed };
    } catch {
      return { kind: "message", content: textContent || "(no response)" };
    }
  }
  return { kind: "message", content: textContent || "(no response)" };
}

export type VideoJob = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  provider: string;
  prompt: string;
  video_url?: string | null;
  error?: string | null;
  fal_request_id?: string | null;
  session_id?: string | null;
};

export async function submitVideoJob(
  prompt: string,
  provider: string,
  sessionId?: string | null,
): Promise<VideoJob> {
  const { data, error } = await supabase.functions.invoke("generate-video", {
    body: { prompt, provider, session_id: sessionId },
  });
  if (error) throw error;
  return data as VideoJob;
}

export async function pollVideoJob(jobId: string): Promise<VideoJob> {
  const { data, error } = await supabase.functions.invoke("generate-video", {
    body: { action: "status", job_id: jobId },
  });
  if (error) throw new Error(error.message || "Could not poll job");
  return data as VideoJob;
}
