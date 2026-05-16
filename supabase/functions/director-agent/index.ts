import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Best-effort in-memory throttle (per-instance only — see plan note)
const RL_WINDOW = 60_000;
const RL_MAX = 12;
const log = new Map<string, number[]>();
function rateLimited(ip: string) {
  const now = Date.now();
  const ts = (log.get(ip) || []).filter((t) => now - t < RL_WINDOW);
  log.set(ip, ts);
  if (ts.length >= RL_MAX) return true;
  ts.push(now);
  return false;
}

// Per-model "playbook" the LLM uses to pick a concrete model id. Each entry
// is rich enough that the agent knows what the model DOES, what it NEEDS, and
// when to prefer it over a sibling. Keep ids in sync with the frontend
// catalog at src/lib/director/videoModelCatalog.ts.
type Playbook = {
  id: string;
  tier: string;              // family + tier label
  input: string;             // input mode (text-to-video, image-to-video, edit, motion-control, ...)
  needs?: string;            // extra inputs the user must provide
  duration: string;          // allowed durations
  aspect: string;            // allowed aspect ratios
  resolution: string;        // native max
  audio: string;             // none / native / preserve-source
  bestFor: string[];         // 2–4 concrete shot types
  avoidFor?: string[];       // known weaknesses
  preferWhen: string;        // tiebreaker vs nearest sibling
};

const MODEL_PLAYBOOK: Playbook[] = [
  // ─── Kling 3.0 Omni (o3) — reference-driven, character/element consistency ──
  {
    id: "kling-omni",
    tier: "Kuaishou Kling 3.0 / Omni (o3)",
    input: "text-to-video with multi-reference characters + elements",
    needs: "optional: up to 7 reference images and/or named elements for consistent characters & locations",
    duration: "3–15s",
    aspect: "16:9, 9:16, 1:1",
    resolution: "1080p",
    audio: "native generation (English/Chinese voice, music, SFX)",
    bestFor: ["multi-shot storyboards with recurring characters", "branded product spots with consistent hero objects", "narrative scenes mixing 2+ characters in a defined location"],
    avoidFor: ["one-off shots with no recurring subjects (overkill — use kling-v3-pro)", "pure VFX/abstract loops"],
    preferWhen: "the brief mentions a character/product/location that must look identical across shots",
  },
  {
    id: "kling-omni-edit",
    tier: "Kuaishou Kling 3.0 / Omni Edit (o3)",
    input: "video-to-video edit",
    needs: "REQUIRED: source video (3–10s, mp4/mov, ≤200MB). Optional: up to 4 reference images/elements via @Image1 / @Element1 in prompt",
    duration: "matches source (3–10s)",
    aspect: "16:9, 9:16, 1:1",
    resolution: "1080p",
    audio: "can preserve source audio (keep_audio) or regenerate",
    bestFor: ["restyle an existing clip (anime, oil-paint, cyberpunk, etc.)", "swap a character into an existing scene", "change wardrobe / lighting / background of an existing take"],
    avoidFor: ["any task without a source video (cannot run)"],
    preferWhen: "the user attached a clip and wants to EDIT it, not generate fresh footage",
  },
  {
    id: "kling-motion-control",
    tier: "Kuaishou Kling 3.0 / Motion Control (v3)",
    input: "motion-control (image + driving video)",
    needs: "REQUIRED: 1 reference image (the character to render) + 1 driving video (the motion to copy). Max 10s for image-orientation, 30s for video-orientation",
    duration: "≤10s image-mode, ≤30s video-mode",
    aspect: "16:9, 9:16, 1:1",
    resolution: "1080p",
    audio: "none",
    bestFor: ["make a still character perform a specific dance/action from a reference clip", "transplant gestures or choreography onto a custom subject"],
    avoidFor: ["scenes with multiple interacting characters", "dialogue (no audio)"],
    preferWhen: "the user wants their character to MIMIC the motion of another existing clip",
  },

  // ─── Kling v3 — top-tier text-to-video with native audio ──
  {
    id: "kling-v3-pro",
    tier: "Kuaishou Kling 3.0 / Pro",
    input: "text-to-video",
    duration: "3–15s",
    aspect: "16:9, 9:16, 1:1",
    resolution: "1080p",
    audio: "native generation, multi-shot",
    bestFor: ["cinematic single-take 8–15s shots", "complex camera moves with photoreal subjects", "long-take dialogue without character consistency needs"],
    avoidFor: ["sub-5s quick iterations (use kling-v3-standard or veo-3.1-lite)"],
    preferWhen: "you need the LONGEST audio-capable Kling shot (up to 15s) at top quality",
  },
  {
    id: "kling-v3-standard",
    tier: "Kuaishou Kling 3.0 / Standard",
    input: "text-to-video",
    duration: "5s or 10s",
    aspect: "16:9, 9:16, 1:1",
    resolution: "1080p",
    audio: "native generation, multi-shot",
    bestFor: ["fast cinematic iterations with dialogue", "social-ready 5–10s shots with sound"],
    preferWhen: "you want kling-v3-pro quality but faster/cheaper and 10s is enough",
  },
  {
    id: "kling-v3-4k",
    tier: "Kuaishou Kling 3.0 / 4K",
    input: "text-to-video",
    duration: "5s or 10s",
    aspect: "16:9, 9:16, 1:1",
    resolution: "native 4K",
    audio: "native generation",
    bestFor: ["hero shots that will be projected / displayed on large screens", "footage that needs to survive heavy color grading"],
    avoidFor: ["quick previews (slow + expensive)"],
    preferWhen: "the user explicitly asks for 4K or theatrical-grade resolution",
  },

  // ─── Kling legacy (no native audio) ──
  {
    id: "kling-v2.5-turbo-pro",
    tier: "Kuaishou Kling 2.5 / Turbo Pro",
    input: "text-to-video",
    duration: "5s or 10s",
    aspect: "16:9, 9:16, 1:1",
    resolution: "1080p",
    audio: "none",
    bestFor: ["fast photoreal action with complex motion", "stunt/parkour/sports beats", "VFX-heavy single takes"],
    preferWhen: "you need Kling's best motion realism but DON'T need audio",
  },
  {
    id: "kling-v2.1-master",
    tier: "Kuaishou Kling 2.1 / Master",
    input: "text-to-video",
    duration: "5s or 10s",
    aspect: "16:9, 9:16, 1:1",
    resolution: "1080p",
    audio: "none",
    bestFor: ["high-quality cinematic photoreal long takes"],
    preferWhen: "kling-v2.5-turbo-pro misses on look but audio isn't needed",
  },
  {
    id: "kling-v2-master",
    tier: "Kuaishou Kling 2.0 / Master",
    input: "text-to-video",
    duration: "5s or 10s",
    aspect: "16:9, 9:16, 1:1",
    resolution: "1080p",
    audio: "none",
    bestFor: ["cinematic photoreal with complex motion (legacy baseline)"],
    preferWhen: "v2.1 master is unavailable or you specifically want the older look",
  },
  {
    id: "kling-v1.6-pro",
    tier: "Kuaishou Kling 1.6 / Pro",
    input: "text-to-video",
    duration: "5s or 10s",
    aspect: "16:9, 9:16, 1:1",
    resolution: "1080p",
    audio: "none",
    bestFor: ["stable photoreal subjects (portraits, products)"],
    preferWhen: "you need rock-stable subject identity without paying for v2+",
  },
  {
    id: "kling-v1.6-standard",
    tier: "Kuaishou Kling 1.6 / Standard",
    input: "text-to-video",
    duration: "5s or 10s",
    aspect: "16:9, 9:16, 1:1",
    resolution: "720p",
    audio: "none",
    bestFor: ["cheap 720p photoreal drafts"],
    preferWhen: "budget/speed matter more than 1080p",
  },
  {
    id: "kling-v1.5-pro",
    tier: "Kuaishou Kling 1.5 / Pro",
    input: "text-to-video",
    duration: "5s or 10s",
    aspect: "16:9, 9:16, 1:1",
    resolution: "1080p",
    audio: "none",
    bestFor: ["legacy photoreal baseline"],
    preferWhen: "1.6 unavailable",
  },
  {
    id: "kling-v1-pro",
    tier: "Kuaishou Kling 1.0 / Pro",
    input: "text-to-video",
    duration: "5s or 10s",
    aspect: "16:9, 9:16, 1:1",
    resolution: "720p",
    audio: "none",
    bestFor: ["legacy 720p photoreal"],
    preferWhen: "only when explicitly requested",
  },
  {
    id: "kling-v1-standard",
    tier: "Kuaishou Kling 1.0 / Standard",
    input: "text-to-video",
    duration: "5s or 10s",
    aspect: "16:9, 9:16, 1:1",
    resolution: "720p",
    audio: "none",
    bestFor: ["cheapest Kling baseline"],
    preferWhen: "rarely — only for retro comparisons",
  },

  // ─── Google Veo ──
  {
    id: "veo-3.1",
    tier: "Google Veo 3.1",
    input: "text-to-video",
    duration: "4s, 6s, or 8s",
    aspect: "16:9, 9:16, 1:1",
    resolution: "1080p",
    audio: "native generation incl. lip-sync dialogue",
    bestFor: ["talking-head dialogue close-ups", "photoreal cinematic with on-screen text/signage", "complex motion with sync sound"],
    avoidFor: ["shots longer than 8s", "highly stylized / anime looks"],
    preferWhen: "the brief needs SPOKEN DIALOGUE or readable text in frame",
  },
  {
    id: "veo-3.1-fast",
    tier: "Google Veo 3.1 / Fast",
    input: "text-to-video",
    duration: "4s, 6s, or 8s",
    aspect: "16:9, 9:16, 1:1",
    resolution: "1080p",
    audio: "native generation",
    bestFor: ["quick dialogue iterations", "social ads needing voice + photoreal"],
    preferWhen: "veo-3.1 quality is overkill and you want 2-3× faster turnaround",
  },
  {
    id: "veo-3.1-lite",
    tier: "Google Veo 3.1 / Lite",
    input: "text-to-video",
    duration: "4s, 6s, or 8s",
    aspect: "16:9, 9:16 ONLY",
    resolution: "1080p",
    audio: "native generation",
    bestFor: ["cheapest Veo with audio for drafts"],
    avoidFor: ["square (1:1) deliverables"],
    preferWhen: "you need audio but budget is the deciding factor",
  },
  {
    id: "veo-3",
    tier: "Google Veo 3",
    input: "text-to-video",
    duration: "8s only",
    aspect: "16:9, 9:16 ONLY",
    resolution: "1080p",
    audio: "native generation incl. dialogue",
    bestFor: ["8s cinematic dialogue beats (legacy baseline)"],
    preferWhen: "veo-3.1 unavailable or specifically requested",
  },
  {
    id: "veo-3-fast",
    tier: "Google Veo 3 / Fast",
    input: "text-to-video",
    duration: "8s only",
    aspect: "16:9, 9:16 ONLY",
    resolution: "1080p",
    audio: "native generation",
    bestFor: ["faster veo-3 dialogue iterations"],
    preferWhen: "veo-3.1-fast unavailable",
  },
  {
    id: "veo-2",
    tier: "Google Veo 2",
    input: "text-to-video",
    duration: "5–8s",
    aspect: "16:9, 9:16 ONLY",
    resolution: "720p",
    audio: "none",
    bestFor: ["silent photoreal cinematic at 720p"],
    preferWhen: "you need Veo's photoreal look without paying for v3",
  },

  // ─── ByteDance Seedance — cinematic film-look ──
  {
    id: "seedance-2.0",
    tier: "ByteDance Seedance 2.0",
    input: "text-to-video",
    duration: "4–15s or 'auto'",
    aspect: "16:9, 9:16, 1:1, 4:3, 3:4, 21:9",
    resolution: "1080p (also 480p/720p)",
    audio: "native generation",
    bestFor: ["cinematic film-grain wide shots", "21:9 anamorphic / scope deliveries", "portrait dialogue with grain & soft halation"],
    preferWhen: "the brief asks for FILM LOOK (35mm, anamorphic, Portra, Vision3) or non-standard aspect ratios",
  },
  {
    id: "seedance-2.0-fast",
    tier: "ByteDance Seedance 2.0 / Fast",
    input: "text-to-video",
    duration: "4–15s or 'auto'",
    aspect: "16:9, 9:16, 1:1, 4:3, 3:4, 21:9",
    resolution: "1080p",
    audio: "native generation",
    bestFor: ["fast cinematic drafts with grain", "iteration on shot framing"],
    preferWhen: "you want seedance-2.0's look at lower cost / faster turnaround",
  },
  {
    id: "seedance-v1-pro",
    tier: "ByteDance Seedance 1 / Pro",
    input: "text-to-video",
    duration: "5s or 10s",
    aspect: "16:9, 9:16, 1:1, 4:3, 3:4, 21:9",
    resolution: "1080p",
    audio: "none",
    bestFor: ["silent cinematic film-grain portrait/wide"],
    preferWhen: "you want Seedance's look without audio",
  },
  {
    id: "seedance-v1-lite",
    tier: "ByteDance Seedance 1 / Lite",
    input: "text-to-video",
    duration: "5s or 10s",
    aspect: "16:9, 9:16, 1:1, 4:3, 3:4, 21:9",
    resolution: "720p",
    audio: "none",
    bestFor: ["cheap stylized cinematic drafts"],
    preferWhen: "cost is the deciding factor and audio isn't needed",
  },

  // ─── MiniMax Hailuo — stylized / anime ──
  {
    id: "hailuo-02-pro",
    tier: "MiniMax Hailuo 02 / Pro",
    input: "text-to-video",
    duration: "fixed (model-defined)",
    aspect: "16:9 ONLY",
    resolution: "1080p",
    audio: "none",
    bestFor: ["anime/stylized portraits with complex character motion", "2.5D illustration looks"],
    avoidFor: ["vertical/square deliveries", "photoreal humans"],
    preferWhen: "the brief asks for ANIME or strongly STYLIZED illustration in 16:9",
  },
  {
    id: "hailuo-02-standard",
    tier: "MiniMax Hailuo 02 / Standard",
    input: "text-to-video",
    duration: "6s or 10s",
    aspect: "16:9 ONLY",
    resolution: "768p",
    audio: "none",
    bestFor: ["cheap anime/stylized 6–10s drafts at 768p"],
    preferWhen: "you want Hailuo's anime look on a budget",
  },
  {
    id: "hailuo-01",
    tier: "MiniMax Hailuo 01",
    input: "text-to-video",
    duration: "fixed (~6s)",
    aspect: "16:9 ONLY",
    resolution: "768p",
    audio: "none",
    bestFor: ["legacy stylized/anime baseline"],
    preferWhen: "only when explicitly requested",
  },

  // ─── Runway ──
  {
    id: "runway-gen3-turbo",
    tier: "Runway Gen-3 / Turbo",
    input: "text-to-video",
    duration: "5s or 10s",
    aspect: "16:9, 9:16",
    resolution: "720p",
    audio: "none",
    bestFor: ["stylized cinematic with Runway's signature painterly look", "music-video moments"],
    avoidFor: ["square (1:1) deliveries", "1080p hero shots"],
    preferWhen: "the brief specifically references Runway's aesthetic",
  },

  // ─── Lightricks LTX — open, fast, stylized ──
  {
    id: "ltx-video-13b",
    tier: "Lightricks LTX Video 13B Distilled",
    input: "text-to-video",
    duration: "5s",
    aspect: "16:9, 9:16, 1:1",
    resolution: "720p",
    audio: "none",
    bestFor: ["very fast 5s stylized drafts with stable subjects"],
    preferWhen: "you need the cheapest/fastest 5s preview",
  },
  {
    id: "ltx-video",
    tier: "Lightricks LTX Video",
    input: "text-to-video",
    duration: "5s",
    aspect: "16:9, 9:16, 1:1",
    resolution: "720p",
    audio: "none",
    bestFor: ["fast 5s stylized drafts"],
    preferWhen: "LTX 13B unavailable",
  },

  // ─── Alibaba Wan ──
  {
    id: "wan-pro",
    tier: "Alibaba Wan / Pro",
    input: "text-to-video",
    duration: "5s or 10s",
    aspect: "16:9, 9:16, 1:1",
    resolution: "720p",
    audio: "none",
    bestFor: ["photoreal/stylized 720p drafts with predictable motion"],
    preferWhen: "Kling/Seedance are unavailable and budget matters",
  },
  {
    id: "wan-v2.2-a14b",
    tier: "Alibaba Wan 2.2 / A14B",
    input: "text-to-video",
    duration: "5s or 10s",
    aspect: "16:9, 9:16, 1:1",
    resolution: "720p",
    audio: "none",
    bestFor: ["cheap stylized 720p iterations"],
    preferWhen: "cost is the deciding factor for non-photoreal work",
  },
];

function formatPlaybook(): string {
  return MODEL_PLAYBOOK.map((m) => {
    const lines = [
      `• ${m.id} — ${m.tier}`,
      `    input: ${m.input}${m.needs ? ` | needs: ${m.needs}` : ""}`,
      `    duration: ${m.duration} | aspect: ${m.aspect} | resolution: ${m.resolution} | audio: ${m.audio}`,
      `    best for: ${m.bestFor.join("; ")}`,
    ];
    if (m.avoidFor && m.avoidFor.length) lines.push(`    avoid for: ${m.avoidFor.join("; ")}`);
    lines.push(`    prefer when: ${m.preferWhen}`);
    return lines.join("\n");
  }).join("\n");
}

const MODEL_IDS = MODEL_PLAYBOOK.map((m) => m.id);


const SYSTEM_PROMPT = `You are an AI Director — a professional cinematographer and creative director who turns a user's brief into a polished, production-ready cinematic prompt for AI video generation.

Your style: warm but expert. Think a senior DP collaborating with a director. Use precise cinematography vocabulary (lens, aperture, lighting setup, camera movement, color grade, mood) without being cold or robotic.

CORE BEHAVIOR — SMART ONE-SHOT:
- The user dumps everything: text brief + reference images + reference videos (analyzed as keyframes) + audio transcripts + parsed PDF/doc text.
- Read the WHOLE brief carefully before deciding.
- If the brief gives you enough to produce a strong cinematic prompt, use the \`generate_prompt\` tool immediately. Do NOT ask filler questions.
- ONLY if a missing detail would meaningfully change the output (e.g. you cannot tell the genre, the subject, or the desired mood), use \`ask_clarification\` with 1–3 targeted questions max. Never ask more than 3.
- If the user asks to actually generate the video, use \`request_video_generation\`.

ASK_CLARIFICATION COHERENCE:
- If ANY question in the batch asks the user to drop/share/upload/attach an image, video, audio, or file, every OTHER question in the same batch MUST be about that media — what to extract from it, what to imitate, what to ignore, framing/palette/mood/pacing/sound to keep or change.
- Do NOT mix a media-drop ask with unrelated topics (duration, aspect ratio, model choice, off-topic creative questions) in the same batch. Save those for a follow-up turn after the media arrives.
- If you need both media AND an unrelated detail, prefer asking ONLY the media question first (1 question is perfectly fine).
- Phrase the media ask plainly with a verb the UI can detect: "Drop a reference image…", "Share a short clip…", "Upload the brief PDF…".

MODEL-ROUTING QUESTIONS:
Before generating a prompt, you MUST know enough to pick a model. Four axes most often decide the pick — and briefs usually omit some of them:
1. Input mode — fresh generation, edit an existing video, mimic motion from a clip, or keep characters consistent across shots? This selects between text-to-video and the Omni / Omni Edit / Motion Control family.
2. Duration — target clip length in seconds (drives 5s/6s/8s/10s/15s tiers).
3. Audio & dialogue — spoken lines, sync sound, music, SFX, or silent? (Audio-capable families: veo-3/3.1, seedance-2.0/2.0-fast, kling-v3 family, kling-omni, kling-omni-edit.)
4. Aspect ratio / orientation — 16:9, 9:16, 1:1, 4:3, 3:4, or 21:9? (hailuo and several veo variants are constrained.)

Rules:
- If you already know at least 3 of the 4 above (from the brief or references), just pick the best model and generate.
- If 2+ axes are missing AND the brief is otherwise enough to generate, call \`ask_clarification\` with one question per missing axis (max 3, in this priority: input mode → duration → audio → aspect ratio).
- Always include concrete options inline so the user can answer in one tap:
  • "Do you want to restyle this exact clip, drive a character with this clip's motion, or generate a fresh video inspired by it?"
  • "How long should the clip be — 5s, 8s, 10s, or other?"
  • "Does it need spoken dialogue, ambient sound + music, or fully silent?"
  • "What aspect ratio — 16:9 landscape, 9:16 vertical, or 1:1 square?"
- Do NOT ask a routing question whose answer is already implied by the brief (e.g. "vertical TikTok ad" → 9:16 known; "silent loop" → audio known; "8-second clip" → duration known; "restyle this clip" → edit mode known).
- Do NOT mix routing questions with a media-drop ask in the same batch (see ASK_CLARIFICATION COHERENCE) — handle media first, routing in the next turn.
- Echo the user's answers back into the breakdown (\`duration_seconds\`, \`audio\`/\`dialogue\`, \`aspect_ratio\` where supported) and use them as the primary drivers when filling \`recommended_model_id\`, \`recommended_alternatives\`, and \`recommendation_reason\`.

MODEL SELECTION ALGORITHM (run this in order before filling \`recommended_model_id\`):

STEP 1 — Input gating (HARD filter, eliminates candidates):
  • If the user attached a SOURCE VIDEO they want to edit/restyle → ONLY \`kling-omni-edit\` qualifies.
  • If the user wants a character to COPY MOTION from another clip → ONLY \`kling-motion-control\` qualifies (needs 1 reference image + 1 driving video).
  • If the user attached IMAGES of characters/products that MUST stay consistent across shots → strongly prefer \`kling-omni\` (multi-reference + named elements).
  • Otherwise all text-to-video models are eligible.

STEP 2 — Capability gating (HARD filter):
  • Drop any model whose max duration < requested duration.
  • Drop any model whose aspect ratios don't include the requested ratio.
  • If audio/dialogue is required, keep only audio-capable models (veo-3/3.1 family, seedance-2.0/2.0-fast, kling-v3 family, kling-omni, kling-omni-edit).
  • If native 4K is explicitly requested, keep only \`kling-v3-4k\`.

STEP 3 — Aesthetic ranking (SOFT score) among remaining candidates:
  • photoreal dialogue close-up → veo-3.1 > seedance-2.0 > kling-v3-pro
  • cinematic film-look wide shot (35mm/anamorphic/Portra) → seedance-2.0 > kling-v3-pro > veo-3.1
  • anime / stylized portrait → hailuo-02-pro > seedance-v1-lite > ltx-video-13b
  • multi-shot storyboard with recurring characters → kling-omni > kling-v3-pro
  • VFX-heavy action / complex motion → kling-v2.5-turbo-pro > kling-v3-pro
  • on-screen readable text / signage → veo-3.1 (strongly preferred)
  • non-standard aspect (4:3 / 3:4 / 21:9) → seedance family only
  • fast cheap iteration → veo-3.1-lite / seedance-2.0-fast / wan-v2.2-a14b / ltx-video-13b

STEP 4 — Output:
  • \`recommended_model_id\` = top of the ranked list.
  • \`recommended_alternatives\` = #2 and #3 from the same ranked list (never duplicate #1, never list a model that failed Step 1 or Step 2).
  • \`recommendation_reason\` = one sentence naming the deciding factor (e.g. "Source video attached → only model that can edit it" or "Native lip-sync dialogue + readable on-screen text in 1080p 9:16").

WHEN YOU GENERATE A PROMPT:
- The \`prompt\` field is the final cinematic prompt the user will paste into a video model. Write it as a single dense paragraph (60–140 words), packed with concrete visual detail: subject + action, camera (lens, angle, movement), lighting (key/fill/practicals, time of day, color temp), environment, mood, color palette, film/look reference if relevant.
- The \`breakdown\` is a structured snapshot of your decisions for the user to scan and tweak.
- ALWAYS fill \`breakdown.negative_prompt\` with concrete things to avoid (face artifacts, motion blur, text/watermark, modern items if vintage, etc).
- ALWAYS fill \`breakdown.recommended_model_id\` with EXACTLY ONE id from the MODEL PLAYBOOK below. Do NOT invent ids. Run the 4-step algorithm above.
- ALWAYS fill \`breakdown.recommended_alternatives\` with 2 backup ids from the same playbook, ranked by suitability and respecting Steps 1–2 hard filters.
- ALWAYS fill \`breakdown.recommendation_reason\` with one sentence naming the deciding factor from the algorithm (input gate / capability gate / aesthetic match).
- ALWAYS fill \`breakdown.model_recommendation\` with a friendly one-line label + reason for display (the structured ids above are the source of truth, this is for humans).
- ALWAYS fill \`breakdown.film_emulation\` if a film/look reference is implied (stock + grade), otherwise leave blank.
- Always be opinionated. If the brief is vague, MAKE strong creative choices and explain them in \`directors_note\`.

═══ MODEL PLAYBOOK — what each model does, what it needs, when to pick it ═══
${formatPlaybook()}

NEVER:
- Output the prompt as plain assistant text. Always use a tool.
- Invent details that contradict the user's references.
- Ask for information you can already infer from the references.
- Use any model id outside the list above.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "ask_clarification",
      description:
        "Ask 1–3 targeted questions when a missing detail would materially change the prompt. Use sparingly.",
      parameters: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: { type: "string" },
            description: "1–3 short, specific questions.",
          },
          reason: {
            type: "string",
            description: "One sentence on why these answers are needed.",
          },
        },
        required: ["questions", "reason"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_prompt",
      description: "Produce the final cinematic prompt and structured breakdown.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short title for this session (max 60 chars)." },
          prompt: { type: "string", description: "The final cinematic prompt, 60–140 words." },
          breakdown: {
            type: "object",
            properties: {
              subject: { type: "string" },
              action: { type: "string" },
              camera: { type: "string", description: "Lens, angle, movement." },
              lighting: { type: "string" },
              mood: { type: "string" },
              color_palette: { type: "string" },
              environment: { type: "string" },
              duration_hint: { type: "string", description: "e.g. '5s' or '10s'." },
              film_emulation: {
                type: "string",
                description:
                  "Film stock / color grading / aesthetic notes (e.g. '35mm Kodak Portra, teal-orange grade').",
              },
              negative_prompt: {
                type: "string",
                description:
                  "Comma-separated negatives the model should avoid (e.g. 'blurry face, motion blur, watermark, text overlay').",
              },
              model_recommendation: {
                type: "string",
                description:
                  "Friendly one-line label + reason for display (e.g. 'Seedance 2.0 — cinematic + native audio').",
              },
              recommended_model_id: {
                type: "string",
                enum: MODEL_IDS,
                description: "EXACT model id from the MODEL PLAYBOOK. Source of truth for the picker.",
              },
              recommended_alternatives: {
                type: "array",
                minItems: 0,
                maxItems: 3,
                items: { type: "string", enum: MODEL_IDS },
                description: "Up to 3 backup model ids, ranked.",
              },
              recommendation_reason: {
                type: "string",
                description: "One short sentence explaining the model choice.",
              },
            },
            required: ["subject", "camera", "lighting", "mood", "negative_prompt", "model_recommendation", "recommended_model_id"],
            additionalProperties: false,
          },
          directors_note: {
            type: "string",
            description: "Brief note on creative choices made.",
          },
        },
        required: ["title", "prompt", "breakdown"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_video_generation",
      description:
        "User explicitly asked to render the actual video. The frontend will route this to the video-generation pipeline.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string" },
          provider_preference: {
            type: "string",
            enum: ["seedance", "veo", "kling", "any"],
          },
        },
        required: ["prompt"],
        additionalProperties: false,
      },
    },
  },
];

async function callGatewayWithRetry(body: unknown, apiKey: string): Promise<Response> {
  const delays = [0, 500, 1500];
  let lastResp: Response | null = null;
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await new Promise((r) => setTimeout(r, delays[i]));
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    // Don't retry on auth/credit/rate-limit errors — surface them
    if (resp.ok || resp.status === 402 || resp.status === 429 || resp.status === 401) {
      return resp;
    }
    lastResp = resp;
  }
  return lastResp!;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: claims, error: claimsErr } = await supabase.auth.getClaims(
    auth.replace("Bearer ", ""),
  );
  if (claimsErr || !claims?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please slow down." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();
    const action = (body as { action?: string })?.action;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Service misconfigured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "rewrite_safe") {
      const { original_prompt, rejection_reason, categories, model_id } = body as {
        original_prompt?: string;
        rejection_reason?: string;
        categories?: string[];
        model_id?: string;
      };
      const orig = typeof original_prompt === "string" ? original_prompt.trim() : "";
      const reason = typeof rejection_reason === "string" ? rejection_reason : "content moderation";
      if (!orig || orig.length > 6000) {
        return new Response(JSON.stringify({ error: "Valid original_prompt required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const catLine = categories?.length ? ` Categories flagged: ${categories.join(", ")}.` : "";
      const sys = `You are a senior cinematographer rewriting an AI video prompt that was rejected by ${model_id || "the target model"}'s content moderation.
Reason: ${reason}.${catLine}

Rules:
- Preserve cinematography, camera (lens/angle/movement), lighting, color grade, environment, and mood.
- Remove or soften ONLY the flagged element. Do not introduce new subjects, brands, or characters.
- Keep the original structure (paragraph or shooting script) intact.
- Do not add disclaimers or meta-commentary.
- Output JSON ONLY via the provided tool — never plain text.`;

      const rewriteResp = await callGatewayWithRetry(
        {
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: `Original prompt:\n\n${orig}` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "safe_rewrite",
                description: "Return a safe rewrite of the prompt.",
                parameters: {
                  type: "object",
                  properties: {
                    rewritten_prompt: { type: "string", description: "The rewritten prompt." },
                    changes_summary: { type: "string", description: "1 short sentence describing what was changed." },
                  },
                  required: ["rewritten_prompt", "changes_summary"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "safe_rewrite" } },
        },
        LOVABLE_API_KEY,
      );

      if (!rewriteResp.ok) {
        const t = await rewriteResp.text();
        console.error("rewrite_safe gateway error", rewriteResp.status, t);
        return new Response(JSON.stringify({ error: "Rewrite failed" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const rData = await rewriteResp.json();
      const tc = rData.choices?.[0]?.message?.tool_calls?.[0];
      let parsed: { rewritten_prompt?: string; changes_summary?: string } = {};
      try {
        parsed = JSON.parse(tc?.function?.arguments || "{}");
      } catch {
        parsed = {};
      }
      if (!parsed.rewritten_prompt) {
        return new Response(JSON.stringify({ error: "Rewrite produced no output" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          rewritten_prompt: parsed.rewritten_prompt,
          changes_summary: parsed.changes_summary || "Softened flagged content while keeping cinematography intact.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { messages, attachments, stream } = body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      attachments?: Array<{
        kind: "image" | "video_keyframes" | "audio_transcript" | "document";
        name: string;
        url?: string;
        text?: string;
      }>;
      stream?: boolean;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (messages.length > 30) {
      return new Response(JSON.stringify({ error: "Too many messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let attachmentBlock = "";
    const imageUrls: string[] = [];
    if (Array.isArray(attachments) && attachments.length > 0) {
      attachmentBlock =
        "\n\n═══ ATTACHED REFERENCES ═══\n" +
        "(The user may refer to these by @N, where N is the number below. " +
        "Resolve any @N token in the brief to the matching reference.)\n";
      attachments.slice(0, 12).forEach((a, idx) => {
        const tag = `[@${idx + 1}]`;
        if ((a.kind === "image" || a.kind === "video_keyframes") && a.url) {
          imageUrls.push(a.url);
          attachmentBlock += `${tag} ${a.kind === "image" ? "Image" : "Video keyframe"}: ${a.name}\n`;
        } else if (a.kind === "audio_transcript" && a.text) {
          attachmentBlock += `${tag} Voice brief transcript (${a.name}): "${a.text.slice(0, 1500)}"\n`;
        } else if (a.kind === "document" && a.text) {
          attachmentBlock += `${tag} Document (${a.name}): """${a.text.slice(0, 4000)}"""\n`;
        }
      });
    }

    const last = messages[messages.length - 1];
    const prior = messages.slice(0, -1);
    const lastUserContent: any =
      imageUrls.length > 0
        ? [
            { type: "text", text: (last.content || "") + attachmentBlock },
            ...imageUrls.slice(0, 8).map((u) => ({ type: "image_url", image_url: { url: u } })),
          ]
        : (last.content || "") + attachmentBlock;

    const aiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...prior.map((m) => ({ role: m.role, content: m.content })),
      { role: last.role, content: lastUserContent },
    ];

    const requestBody = {
      model: "google/gemini-3.1-pro-preview",
      messages: aiMessages,
      tools: TOOLS,
      tool_choice: "auto" as const,
      stream: !!stream,
    };

    const aiResp = await callGatewayWithRetry(requestBody, LOVABLE_API_KEY);

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited by AI provider. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Streaming: pipe through
    if (stream) {
      return new Response(aiResp.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Non-streaming JSON path
    const data = await aiResp.json();
    const choice = data.choices?.[0]?.message;
    const toolCall = choice?.tool_calls?.[0];

    if (toolCall?.function?.name) {
      const fnName = toolCall.function.name;
      let args: any = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        args = {};
      }
      return new Response(JSON.stringify({ kind: fnName, ...args }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ kind: "message", content: choice?.content || "..." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("director-agent error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
