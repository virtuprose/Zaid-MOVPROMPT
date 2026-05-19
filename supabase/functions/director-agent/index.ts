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

// Per-model playbook + selection helpers come from the SHARED single source
// of truth, also consumed by the frontend model picker so they cannot drift.
import {
  MODEL_CATALOG,
  formatPlaybook,
} from "../_shared/videoModelCatalog.ts";
import {
  chargeCredits,
  InsufficientCreditsError,
  insufficientResponse,
  priceFor,
} from "../_shared/credits.ts";

const MODEL_IDS = MODEL_CATALOG.map((m) => m.id);


const SYSTEM_PROMPT = `You are an AI Director — a professional cinematographer collaborating with the user on set. You turn a brief into a polished, production-ready cinematic prompt for AI video generation.

Your voice: concise, on-set, technical. Think senior DP calling the shot. Precise cinematography vocabulary (lens, aperture, key/fill, dolly/crane, color grade, stock). No filler, no warm-and-fuzzy padding, no emoji. Direct verbs: "Call the shot.", "Pick your lens.", "Hold for the move."

ALWAYS HELP THE USER ANSWER — NEVER LEAVE THEM STARING AT A BLANK FIELD:
- Whenever you call ask_clarification, ALSO populate the \`suggestions\` array with 3–5 short, on-tap chips per question. Chips MUST be answerable in one tap (e.g. "85mm", "Anamorphic 2.39", "Golden hour", "Steadicam push-in").
- Skip chips ONLY for questions that genuinely require freeform input (e.g. brand name, character description). Otherwise: always offer chips.
- When you call generate_prompt, ALSO populate \`next_suggestions\` with 3–5 one-tap follow-ups the user might want next (e.g. "Tighter on the eyes", "Swap to anamorphic 2.39", "Push in slower", "Render this").

CORE BEHAVIOR — SMART ONE-SHOT:
- The user dumps everything: text brief + reference images + reference videos (analyzed as keyframes) + audio transcripts + parsed PDF/doc text.
- Read the WHOLE brief carefully before deciding.
- If the brief gives you enough to move forward, run the FIRST-TURN PATH CHOICE below before anything else. Otherwise ask first.
- ONLY ask filler questions when a missing detail would meaningfully change the output. Use \`ask_clarification\` with up to 4 targeted questions.
- If the user asks to actually generate the video, use \`request_video_generation\`.

FIRST-TURN PATH CHOICE (HARD RULE — runs before any model routing):
- On the FIRST turn where the user has given a creative brief (text, voice, or attached references) and you have enough to move forward, your FIRST response MUST be \`ask_clarification\` with exactly ONE question: "Want me to generate a key frame first, or go straight to the video?". Populate \`suggestions\` for question_index 0 with chips: ["Generate a key frame first", "Go straight to video", "Upload a reference image"]. Set \`reason\`: "Picking a key frame first locks the look before we commit to a video render."
- If the user already attached a reference image/video on that first turn, replace the 3rd chip with "Use the reference I uploaded".
- Skip the fork entirely (and proceed with the existing flow) when:
  • The brief explicitly says "make the video" / "render directly" / "skip the keyframe" / names a specific model id → go straight to \`ask_model_choice\` (or \`generate_prompt\` per Exception 1).
  • The brief explicitly says "give me a key frame" / "storyboard first" / "hero shot first" → go straight to \`generate_reference_image\` with \`mode: "single_panel"\`.

BRANCH A — user picked "Generate a key frame first":
- Call \`generate_reference_image\` with \`mode: "single_panel"\`, the locked visual spec echoed in \`prompt\`, no \`reference_urls\`. Do NOT ask model-routing questions yet — a key frame doesn't need them.
- On the user's next turn, if they ask to render the video, fall into BRANCH B but skip the reference-image ask (the just-generated key frame IS the reference) and go straight to \`ask_model_choice\`.

BRANCH B — user picked "Go straight to video":
- Step B1: If no reference image is attached yet in the thread, your NEXT turn MUST be \`ask_clarification\` with ONE media-drop question: "Drop 1–3 reference images for the look (or skip)." Chips: ["Skip — text-only"]. (Obeys ASK_CLARIFICATION COHERENCE — media ask stays alone.) Skip B1 entirely if references were already attached.
- Step B2: Call \`ask_model_choice\` (existing rules apply — full \`locked_spec\` recap, recommended + 2 alternatives).
- Step B3: After the model is confirmed, ask any remaining routing axes via \`ask_clarification\` per the existing rules, then \`generate_prompt\`.

BRANCH C — user picked "Upload a reference image" / "Use the reference I uploaded":
- Treat as BRANCH B with a reference attached → skip B1's media-drop ask, go straight to \`ask_model_choice\`.

ASK_CLARIFICATION COHERENCE:
- If ANY question in the batch asks the user to drop/share/upload/attach an image, video, audio, or file, every OTHER question in the same batch MUST be about that media — what to extract from it, what to imitate, what to ignore, framing/palette/mood/pacing/sound to keep or change.
- Do NOT mix a media-drop ask with unrelated topics (duration, aspect ratio, model choice, off-topic creative questions) in the same batch. Save those for a follow-up turn after the media arrives.
- If you need both media AND an unrelated detail, prefer asking ONLY the media question first (1 question is perfectly fine).
- Phrase the media ask plainly with a verb the UI can detect: "Drop a reference image…", "Share a short clip…", "Upload the brief PDF…".

MODEL-ROUTING QUESTIONS:
Before generating a prompt, you MUST know enough to pick a model AND lock the render spec. Six axes most often decide the pick — and briefs usually omit some of them:
1. Input mode — fresh generation, edit an existing video, mimic motion from a clip, or keep characters consistent across shots? This selects between text-to-video and the Omni / Omni Edit / Motion Control family.
2. Duration — target clip length in seconds (drives 5s/6s/8s/10s/15s tiers).
3. Audio & dialogue — spoken lines, sync sound, music, SFX, or silent? (Audio-capable families: veo-3/3.1, seedance-2.0-ref (needs a reference image), kling-v3 family, kling-omni, kling-omni-edit.)
4. Aspect ratio / orientation — 16:9, 9:16, 1:1, 4:3, 3:4, or 21:9? (hailuo and several veo variants are constrained.)
5. Resolution / fidelity — 720p draft, 1080p standard, or native 4K (kling-v3-4k only)? Drives which Kling endpoint runs and whether 1080p-capable models are required.
6. Style — photoreal (realistic humans, products, documentary), cinematic-film (graded anamorphic film-grain look), stylized (illustrative, painterly, graphic, 3D-render), or anime (2D anime/manga/cel)? Heavy driver of model pick: photoreal → veo-3.1/kling-v3-pro/seedance; cinematic-film → seedance-v1-pro/seedance-2.0-ref; stylized → wan-v2.2-a14b/ltx-video-13b; anime → hailuo-02-pro/wan-v2.2-a14b.

Rules:
- If you already know at least 5 of the 6 axes from the brief or references, you may proceed — but you MUST echo the full spec in the recap below.
- If 2+ axes are missing AND the brief is otherwise enough to generate, call \`ask_clarification\` with one question per missing axis (max 4, in this priority: input mode → duration → audio → aspect ratio → resolution → style).
- Always include concrete options inline so the user can answer in one tap:
  • "Do you want to restyle this exact clip, drive a character with this clip's motion, or generate a fresh video inspired by it?"
  • "How long should the clip be — 5s, 8s, 10s, 15s, or other?"
  • "Does it need spoken dialogue, ambient sound + music, or fully silent?"
  • "What aspect ratio — 16:9 landscape, 9:16 vertical, or 1:1 square?"
  • "Render at 720p (fastest), 1080p (standard), or native 4K (Kling v3 4K, slower)?"
  • "What visual style — photoreal, cinematic film look, stylized/painterly, or anime?"
- Do NOT ask a routing question whose answer is already implied by the brief (e.g. "vertical TikTok ad" → 9:16 known; "silent loop" → audio known; "8-second clip" → duration known; "restyle this clip" → edit mode known; "social draft" → 720p implied; "4K hero shot" → 4K known; user uploads a photo of a real person → photoreal style implied; words like "anime/cartoon/cel-shaded" → anime; "film grain / anamorphic / Portra / Kodak / shot on 35mm" → cinematic-film; "3D render / painterly / illustration / graphic" → stylized).
- Do NOT mix routing questions with a media-drop ask in the same batch (see ASK_CLARIFICATION COHERENCE) — handle media first, routing in the next turn.
- Echo the user's answers back into the breakdown (\`duration_seconds\`, \`audio\`/\`dialogue\`, \`aspect_ratio\`, \`resolution\`, \`style\`) and use them as the primary drivers when filling \`recommended_model_id\`, \`recommended_alternatives\`, and \`recommendation_reason\`.

LOCKED-SPEC RECAP (HARD RULE — applies to BOTH \`ask_model_choice\` AND \`generate_prompt\`):
- Before either tool fires, you MUST have explicit or strongly-implied values for ALL 6 axes. If even one is still unknown and not safely inferable, ask first instead of guessing.
- ALWAYS populate the \`locked_spec\` object on the tool call with the values you committed to: \`{ input_mode, duration_seconds, aspect_ratio, audio, resolution, style }\`.
- ALWAYS prefix the \`reason\` (or \`recommendation_reason\`) with a one-line recap of the spec so the user can spot a wrong assumption before tapping. Format: "Locked: 15s · 9:16 · native SFX · 1080p · photoreal · fresh generation — <why this model>".
- NEVER claim a value the user did not state or that is not directly implied by attached references. If unsure, ASK — do not silently default. No hallucinated specs.

STYLE & SPEC CONTINUITY ACROSS SHOTS (HARD RULE — applies to multi-shot storyboards and any follow-up shot in the same session):
- The conversation history serializes every prior generated prompt as "[Previously generated prompt …]" with a "Locked spec: …" line containing the prior \`{ duration · aspect_ratio · resolution · audio · style · input_mode }\`. Treat this as ground truth.
- When the user asks for "another shot", "next shot", "shot 2/3/…", "a wide of the same scene", "reverse angle", "cutaway", "B-roll of the same", or any continuation of an existing storyboard, you MUST reuse the EXACT same \`style\` from the most recent locked spec. Do not switch from photoreal to stylized (or vice versa) mid-sequence.
- Also reuse the same \`aspect_ratio\`, \`resolution\`, and \`audio\` mode unless the user explicitly changes them. Duration may vary per shot.
- Carry the \`film_emulation\` / \`color_palette\` language forward verbatim (same stock, same grade, same LUT) so cuts feel like one production. The \`prompt\` text for each new shot MUST echo the locked style's visual vocabulary (e.g. photoreal → "natural skin, real-world physics, documentary realism"; cinematic-film → "35mm grain, halation, anamorphic flares, teal-orange grade"; stylized → "painterly, illustrative shapes, graphic palette"; anime → "2D cel-shaded, line art, anime composition").
- For multi-reference storyboards (kling-omni / seedance-2.0-ref), also reuse the SAME \`recommended_model_id\` across shots — switching engines mid-storyboard breaks character/identity consistency.
- The ONLY way to change style mid-session is if the user explicitly says so (e.g. "switch to anime for this one", "make shot 3 stylized"). Then update \`locked_spec.style\` and call it out in \`directors_note\`.

MODEL SELECTION ALGORITHM (run this in order before filling \`recommended_model_id\`):

STEP 1 — Input gating (HARD filter, eliminates candidates):
  • If the user attached a SOURCE VIDEO they want to edit/restyle → ONLY \`kling-omni-edit\` qualifies.
  • If the user wants a character to COPY MOTION from another clip → ONLY \`kling-motion-control\` qualifies (needs 1 reference image + 1 driving video).
  • If the user attached IMAGES of characters/products that MUST stay consistent across shots → keep only multi-reference models: \`kling-omni\` and \`seedance-2.0-ref\` (both accept multiple named/numbered reference images, up to 9). Let Step 3 rank between them. NEVER claim either one is "the only" multi-reference model.
  • Otherwise all text-to-video models are eligible.

STEP 2 — Capability gating (HARD filter):
  • Drop any model whose max duration < requested duration.
  • Drop any model whose aspect ratios don't include the requested ratio.
  • If audio/dialogue is required, keep only audio-capable models (veo-3/3.1 family, seedance-2.0-ref (only when a reference image is attached), kling-v3 family, kling-omni, kling-omni-edit).
  • If native 4K is explicitly requested, keep only \`kling-v3-4k\`.

STEP 3 — Aesthetic ranking (SOFT score) among remaining candidates:
  • photoreal dialogue close-up → veo-3.1 > kling-v3-pro > seedance-v1-pro
  • cinematic film-look wide shot (35mm/anamorphic/Portra) → seedance-v1-pro > kling-v3-pro > veo-3.1 (use seedance-2.0-ref only if a reference image is attached)
  • anime / stylized portrait → hailuo-02-pro > seedance-v1-lite > ltx-video-13b
  • multi-shot storyboard with recurring characters → kling-omni > seedance-2.0-ref > kling-v3-pro (prefer seedance-2.0-ref when the look is cinematic film-grade or needs a non-standard aspect ratio like 21:9 / 4:3; prefer kling-omni when shots need named element references and tight identity lock across many cuts).
  • VFX-heavy action / complex motion → kling-v2.5-turbo-pro > kling-v3-pro
  • on-screen readable text / signage → veo-3.1 (strongly preferred)
  • non-standard aspect (4:3 / 3:4 / 21:9) → seedance family only
  • fast cheap iteration → veo-3.1-lite / seedance-v1-lite / wan-v2.2-a14b / ltx-video-13b

STEP 4 — Output:
  • \`recommended_model_id\` = top of the ranked list.
  • \`recommended_alternatives\` = #2 and #3 from the same ranked list (never duplicate #1, never list a model that failed Step 1 or Step 2).
  • \`recommendation_reason\` = one sentence naming the deciding factor (e.g. "Source video attached → only model that can edit it" or "Native lip-sync dialogue + readable on-screen text in 1080p 9:16").

CONFIRM THE TARGET MODEL BEFORE GENERATING (HARD RULE):
- Before you EVER call \`generate_prompt\`, you MUST first call \`ask_model_choice\` so the user picks the target video model. The final cinematic prompt is tuned to that exact model's strengths (camera vocabulary, audio capability, prompt length, structure), so this choice cannot be skipped.
- This applies on the FIRST turn that has enough info to generate, even when the brief looks complete. Pick your top recommendation via the 4-step algorithm, list 2 alternatives, and let the user confirm with one tap.
- When the user attaches a reference image / video on their first message, your FIRST response must be \`ask_model_choice\` (so they can pick e.g. seedance-v1-pro vs veo-3.1 vs kling-omni for that exact reference). Do not generate the prompt in the same turn as the upload.
- Exception 1: if the user's brief already names a specific model id from the playbook (e.g. "for veo-3.1", "use kling-v3-pro"), skip \`ask_model_choice\` and go straight to \`generate_prompt\` with \`breakdown.recommended_model_id\` = that id.
- Exception 2: if you already asked \`ask_model_choice\` earlier in this conversation AND the user's latest message picks one (e.g. starts with "Target model:" or names a model id), do NOT ask again — call \`generate_prompt\` with that exact id pinned in \`breakdown.recommended_model_id\`.
- When you call \`ask_model_choice\`, populate \`recommended_model_id\` using the 4-step MODEL SELECTION ALGORITHM above, plus 2 ranked \`alternatives\` and a one-sentence \`reason\`. Never invent ids — only use values from the playbook.

CONVERSATION MEMORY (HARD RULE):
- The conversation history you receive includes EVERY prior turn, serialized: user messages (with a "[Attached on this turn: …]" hint when files were uploaded), previously generated prompts (as "[Previously generated prompt …]" assistant lines with the full prompt + breakdown), prior clarification questions, and prior model recommendations.
- Treat all of this as ground truth. NEVER ask the user to re-upload a reference, re-state the subject, or re-pick the model if any of that already happened earlier in the thread. If a reference image was uploaded on turn 1, it is still in play on turn 5.
- When the user asks for "variations", "N ideas", "alternatives", or "options" of something you already produced, anchor on the most recent "[Previously generated prompt …]" entry and propose distinct creative angles (different lens / lighting / mood / film stock) rather than starting from scratch. If the user explicitly asks for N (e.g. "give me 3 ideas"), respond with \`ask_clarification\` listing the N concept directions as short pitches so they can pick one to develop fully — do not silently collapse the request to a single prompt.

WHEN YOU GENERATE A PROMPT:
- The \`prompt\` field is the final cinematic prompt the user will paste into a video model. Write it as a single dense paragraph (60–140 words), packed with concrete visual detail: subject + action, camera (lens, angle, movement), lighting (key/fill/practicals, time of day, color temp), environment, mood, color palette, film/look reference if relevant.
- Tailor the wording to the model the user picked (or that they confirmed): for veo/seedance audio-capable models include explicit dialogue/SFX cues; for kling-omni-edit phrase as edit instructions on the source; for hailuo keep it tight; etc.
- The \`breakdown\` is a structured snapshot of your decisions for the user to scan and tweak.
- ALWAYS fill \`breakdown.negative_prompt\` with concrete things to avoid (face artifacts, motion blur, text/watermark, modern items if vintage, etc).
- ALWAYS fill \`breakdown.recommended_model_id\` with EXACTLY ONE id from the MODEL PLAYBOOK below. Do NOT invent ids. Run the 4-step algorithm above.
- ALWAYS fill \`breakdown.recommended_alternatives\` with 2 backup ids from the same playbook, ranked by suitability and respecting Steps 1–2 hard filters.
- ALWAYS fill \`breakdown.recommendation_reason\` with one sentence naming the deciding factor from the algorithm (input gate / capability gate / aesthetic match).
- ALWAYS fill \`breakdown.model_recommendation\` with a friendly one-line label + reason for display (the structured ids above are the source of truth, this is for humans). NEVER write that a model is "the only one" that can do multi-reference / storyboard — both \`kling-omni\` and \`seedance-2.0-ref\` ingest multiple reference images. Phrase the reason as a comparative trade-off (e.g. "Kling Omni edges out Seedance 2.0 Ref here because you need named element tags across 5 cuts").
- ALWAYS fill \`breakdown.film_emulation\` if a film/look reference is implied (stock + grade), otherwise leave blank.
- Always be opinionated. If the brief is vague, MAKE strong creative choices and explain them in \`directors_note\`.

═══ MODEL PLAYBOOK — what each model does, what it needs, when to pick it ═══
${formatPlaybook()}

IMAGE GENERATION (use sparingly — only to unblock the storyboard / key-frame flow):
- You have a \`generate_reference_image\` tool that creates a character sheet OR up to 9 storyboard panels OR a single hero/key frame.
- Use it ONLY when:
  1. The user has a storyboard but NO character reference → \`mode: "character_sheet"\` to design a protagonist that fits the locked style. The output is a 3-view sheet (front + 3/4 + side) in one image — use it as the identity anchor for every subsequent panel.
  2. The user has a character but NO storyboard panels → \`mode: "storyboard_panels"\` with \`per_shot_prompts\` (one per beat), \`lock_mode: "character"\` (or omit — auto), AND pass the character image URL in \`reference_urls\` so identity locks across panels.
  3. The user explicitly asks for a single polished image — product shot, cinematic still, key art, establishing frame, opening shot, hero frame — and there is no character/scene to lock to yet → \`mode: "single_panel"\` with the full locked visual spec in \`prompt\` and NO \`reference_urls\`. The edge function appends a hero-frame polish suffix automatically.
  4. The user wants to EXTEND a previously generated key frame into a sequence ("extend this", "give me N more frames", "continue the scene", "build a frame-by-frame from this", "make a sequence") → \`mode: "storyboard_panels"\`, \`lock_mode: "scene"\`, \`reference_urls: [<the key-frame URL from the prior turn>]\`, and \`per_shot_prompts\` with one beat per continuation frame (camera move, micro-action, lighting drift, time passing). Echo the locked visual spec verbatim in each beat. BEFORE calling, lay out the proposed beats in \`directors_note\` so the user can approve or tweak.
- IDENTITY/SCENE LOCK (HARD RULE for storyboard_panels): you MUST pass the anchor image URL in \`reference_urls\` on EVERY storyboard_panels call — first generation AND every regenerate. Pick \`lock_mode\`: "character" when the anchor is a character sheet, "scene" when the anchor is a key/hero frame (product, landscape, establishing). The edge function injects the matching lock phrase, but only works if the reference is attached.
- For \`character_sheet\`, \`storyboard_panels\`, and \`single_panel\`, echo the LOCKED visual spec verbatim in each prompt (style, lighting, color grade, film_emulation) so generated images match the planned video look. For storyboard_panels, also include the per-shot beat (action, framing, camera angle) after the style spec.
- REGENERATE A SINGLE PANEL: when the user says "redo panel 4", "regenerate shot 2", or sends a note tagged "Regenerate panel N", call \`generate_reference_image\` with \`mode: "storyboard_panels"\`, \`per_shot_prompts: [<the rewritten beat for that one panel>]\`, \`shot_index: N\`, the same \`lock_mode\` used originally, AND the same anchor image in \`reference_urls\`. Do not re-generate the other 8.
- REGENERATE THE CHARACTER SHEET: when the user asks to redo the character, call \`mode: "character_sheet"\` again with the refined description. Then the user will need to regenerate the storyboard panels to pick up the new identity (mention this).
- After the images return, the client attaches them with role: "character", "storyboard" (+ shot_index), "key_frame", or "reference". They become first-class references for subsequent \`ask_model_choice\` → \`generate_storyboard_batch\` calls.
- DO NOT use this tool to make art the user didn't ask for. DO NOT use it as a substitute for video. DO NOT generate more than one character_sheet per session unless the user asks for variations.



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
            maxItems: 4,
            items: { type: "string" },
            description: "1–4 short, specific questions.",
          },
          reason: {
            type: "string",
            description: "One sentence on why these answers are needed.",
          },
          suggestions: {
            type: "array",
            minItems: 0,
            maxItems: 4,
            description:
              "One entry per question that benefits from chips. Each entry has the question_index (0-based) and 3–5 short tap-to-answer chips. Omit entries for free-form questions.",
            items: {
              type: "object",
              properties: {
                question_index: { type: "integer", minimum: 0, maximum: 3 },
                chips: {
                  type: "array",
                  minItems: 2,
                  maxItems: 6,
                  items: { type: "string" },
                },
                allow_other: { type: "boolean", description: "Whether to keep the free-text input visible alongside chips. Default true." },
              },
              required: ["question_index", "chips"],
              additionalProperties: false,
            },
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
      name: "ask_model_choice",
      description:
        "Ask the user which target video model the final prompt should be tuned for. MUST be called before `generate_prompt` unless the user already named a model id. ALWAYS include a `locked_spec` recap of the 5 routing axes.",
      parameters: {
        type: "object",
        properties: {
          recommended_model_id: {
            type: "string",
            enum: MODEL_IDS,
            description: "Your top pick from the MODEL SELECTION ALGORITHM.",
          },
          alternatives: {
            type: "array",
            minItems: 0,
            maxItems: 3,
            items: { type: "string", enum: MODEL_IDS },
            description: "Up to 3 ranked backup ids (no duplicates of recommended_model_id).",
          },
          reason: {
            type: "string",
            description: "One short sentence on why the recommended pick fits this brief, PREFIXED with the locked-spec recap (e.g. 'Locked: 15s · 9:16 · native SFX · 1080p · fresh — Kling Omni …').",
          },
          locked_spec: {
            type: "object",
            description: "The 6 routing axes you've committed to. NEVER guess — only include values explicitly stated or strongly implied.",
            properties: {
              input_mode: { type: "string", enum: ["text-to-video", "image-to-video", "video-edit", "motion-control", "multi-reference"] },
              duration_seconds: { type: "number", description: "Target clip length in seconds." },
              aspect_ratio: { type: "string", description: "e.g. '16:9', '9:16', '1:1', '4:3', '3:4', '21:9'." },
              audio: { type: "string", enum: ["silent", "sfx", "music", "dialogue", "full"], description: "'silent' | 'sfx' (ambient/SFX only) | 'music' | 'dialogue' (lip-sync) | 'full' (dialogue + music + SFX)." },
              resolution: { type: "string", enum: ["720p", "1080p", "4k"] },
              style: { type: "string", enum: ["photoreal", "cinematic-film", "stylized", "anime"], description: "Visual style — heavy driver of model pick." },
            },
            additionalProperties: false,
          },
        },
        required: ["recommended_model_id", "reason", "locked_spec"],
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
              resolution: { type: "string", enum: ["720p", "1080p", "4k"], description: "Render resolution echoed from locked_spec." },
              aspect_ratio: { type: "string", description: "Render aspect ratio echoed from locked_spec." },
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
          locked_spec: {
            type: "object",
            description: "The 6 routing axes you've committed to. NEVER guess — only include values explicitly stated or strongly implied. Mirror the same values you would have sent on ask_model_choice.",
            properties: {
              input_mode: { type: "string", enum: ["text-to-video", "image-to-video", "video-edit", "motion-control", "multi-reference"] },
              duration_seconds: { type: "number" },
              aspect_ratio: { type: "string" },
              audio: { type: "string", enum: ["silent", "sfx", "music", "dialogue", "full"] },
              resolution: { type: "string", enum: ["720p", "1080p", "4k"] },
              style: { type: "string", enum: ["photoreal", "cinematic-film", "stylized", "anime"] },
            },
            additionalProperties: false,
          },
          directors_note: {
            type: "string",
            description: "Brief note on creative choices made.",
          },
          next_suggestions: {
            type: "array",
            minItems: 0,
            maxItems: 5,
            items: { type: "string" },
            description:
              "3–5 short tap-to-send follow-up actions the user might want next (e.g. 'Tighter on the eyes', 'Push in slower', 'Swap to anamorphic 2.39', 'Render this').",
          },
        },
        required: ["title", "prompt", "breakdown", "locked_spec"],
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
  {
    type: "function",
    function: {
      name: "generate_reference_image",
      description:
        "Generate a missing character sheet or storyboard panel(s) on demand. Use ONLY when the user is missing a character sheet (and you need one to lock identity across shots) OR missing storyboard panels (and you need them to plan shot-by-shot prompts) OR explicitly asks for a starting frame. NEVER use this to make ad-hoc art the user did not ask for, and NEVER as a substitute for video generation.",
      parameters: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            enum: ["character_sheet", "storyboard_panels", "single_panel"],
            description:
              "character_sheet: 1 full-body reference sheet for the protagonist. storyboard_panels: up to 9 panels in shot order (use per_shot_prompts). single_panel: 1 starting frame for a single shot.",
          },
          prompt: {
            type: "string",
            description:
              "Image prompt. For character_sheet: describe the character with the LOCKED visual spec (style, lighting, color grade) so they match the planned look. For single_panel: describe the frame. For storyboard_panels: a shared style/world preamble; per-shot beats go in per_shot_prompts.",
          },
          reference_urls: {
            type: "array",
            maxItems: 4,
            items: { type: "string" },
            description:
              "Existing images to stay on-model. For storyboard_panels you SHOULD pass the character image here so identity holds across panels.",
          },
          count: {
            type: "integer",
            minimum: 1,
            maximum: 9,
            description:
              "Only used when per_shot_prompts is omitted. For storyboard_panels, default 9.",
          },
          aspect_ratio: {
            type: "string",
            enum: ["1:1", "16:9", "9:16"],
            description: "Echo the locked aspect when possible. Defaults to 1:1 for character_sheet, 16:9 otherwise.",
          },
          per_shot_prompts: {
            type: "array",
            minItems: 1,
            maxItems: 9,
            items: { type: "string" },
            description:
              "Required for storyboard_panels. One prompt per panel, in shot order, each including the per-shot beat plus the locked style vocabulary. The edge function automatically prepends the identity-lock phrase and the 'Shot N of N:' prefix when a character reference is attached.",
          },
          shot_index: {
            type: "integer",
            minimum: 1,
            maximum: 9,
            description:
              "Only for storyboard_panels regeneration of ONE panel. When set, the single per_shot_prompts entry is treated as the new beat for that panel index (1..9). Other panels are untouched. Always pair with the anchor image in reference_urls.",
          },
          lock_mode: {
            type: "string",
            enum: ["character", "scene", "auto"],
            description:
              "How to lock generations to the attached reference. 'character' (default when ref is a character sheet) preserves face/hair/outfit. 'scene' (use for key-frame extensions: product shots, landscapes, establishing frames) preserves location, lighting, lens, and composition. 'auto' defers to the default (character lock when ref present).",
          },
          directors_note: {
            type: "string",
            description: "Short note shown to the user explaining why you generated these.",
          },

        },
        required: ["mode", "prompt"],
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
          model: "google/gemini-3.1-pro-preview",
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

    if (action === "generate_storyboard_batch") {
      const { locked_spec, model_id, character_ref_urls, panels, brief } = body as {
        locked_spec?: Record<string, unknown>;
        model_id?: string;
        character_ref_urls?: string[];
        panels?: Array<{ index: number; panel_url: string; hint?: string }>;
        brief?: string;
      };
      if (!locked_spec || !model_id || !Array.isArray(panels) || panels.length === 0) {
        return new Response(JSON.stringify({ error: "locked_spec, model_id, and panels are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (panels.length > 9) {
        return new Response(JSON.stringify({ error: "Max 9 panels per storyboard batch" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const charRefs = Array.isArray(character_ref_urls) ? character_ref_urls.filter((u) => typeof u === "string" && u.length > 0) : [];
      const lockedRecap = [
        (locked_spec as any).duration_seconds ? `${(locked_spec as any).duration_seconds}s` : null,
        (locked_spec as any).aspect_ratio,
        (locked_spec as any).resolution,
        (locked_spec as any).audio,
        (locked_spec as any).style,
        (locked_spec as any).input_mode,
      ].filter(Boolean).join(" · ");

      const sortedPanels = [...panels].sort((a, b) => a.index - b.index);
      const sys = `You are an AI Director generating a multi-shot storyboard batch.

LOCKED SPEC (apply identically to EVERY shot): ${lockedRecap}
TARGET MODEL: ${model_id}
${brief ? `USER BRIEF: ${brief}\n` : ""}
${charRefs.length > 0 ? `CHARACTER REFERENCE(S): ${charRefs.length} image(s) attached first. Treat as the canonical identity for every shot. Describe the same wardrobe, face, hair, build in EVERY shot's "subject" field — never invent a new look.` : "No persistent character reference — keep visual continuity from the locked style alone."}

You will receive ${sortedPanels.length} storyboard panel image(s) after the character refs, in order (shot 1 → shot ${sortedPanels.length}).

For EACH panel produce one cinematic shot prompt that:
- Reuses the locked spec verbatim (style, aspect, resolution, audio mode).
- Names the same character (when applicable) so identity is locked across cuts.
- Carries forward the same film_emulation / color_palette / look across every shot — same stock, same grade, same lens family, same lighting key.
- Stays specific to what the panel shows (composition, action, camera angle).
- Is 50–120 words.

Output via the \`storyboard_shots\` tool ONLY.`;

      const userParts: any[] = [{ type: "text", text: `Generate ${sortedPanels.length} on-model shot prompts. Panels are in reading order. Hints (if any) are creative direction per shot.\n\n${sortedPanels.map((p) => `Shot ${p.index}${p.hint ? ` — hint: ${p.hint}` : ""}`).join("\n")}` }];
      for (const u of charRefs.slice(0, 4)) userParts.push({ type: "image_url", image_url: { url: u } });
      for (const p of sortedPanels) userParts.push({ type: "image_url", image_url: { url: p.panel_url } });

      const batchResp = await callGatewayWithRetry(
        {
          model: "google/gemini-3.1-pro-preview",
          messages: [
            { role: "system", content: sys },
            { role: "user", content: userParts },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "storyboard_shots",
                description: "Return one prompt + breakdown per panel, in order.",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Short title for the whole storyboard." },
                    shots: {
                      type: "array",
                      minItems: 1,
                      maxItems: 9,
                      items: {
                        type: "object",
                        properties: {
                          index: { type: "integer", minimum: 1, maximum: 9 },
                          prompt: { type: "string" },
                          breakdown: {
                            type: "object",
                            properties: {
                              subject: { type: "string" },
                              action: { type: "string" },
                              camera: { type: "string" },
                              lighting: { type: "string" },
                              mood: { type: "string" },
                              color_palette: { type: "string" },
                              film_emulation: { type: "string" },
                              negative_prompt: { type: "string" },
                            },
                            required: ["subject", "camera", "lighting", "negative_prompt"],
                            additionalProperties: false,
                          },
                        },
                        required: ["index", "prompt", "breakdown"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["title", "shots"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "storyboard_shots" } },
        },
        LOVABLE_API_KEY,
      );

      if (!batchResp.ok) {
        const t = await batchResp.text();
        console.error("storyboard_batch gateway error", batchResp.status, t);
        return new Response(JSON.stringify({ error: "Storyboard generation failed" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const bData = await batchResp.json();
      const tc = bData.choices?.[0]?.message?.tool_calls?.[0];
      let parsed: { title?: string; shots?: any[] } = {};
      try {
        parsed = JSON.parse(tc?.function?.arguments || "{}");
      } catch {
        parsed = {};
      }
      if (!Array.isArray(parsed.shots) || parsed.shots.length === 0) {
        return new Response(JSON.stringify({ error: "Storyboard produced no shots" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          title: parsed.title || "Storyboard",
          shots: parsed.shots,
          locked_spec,
          model_id,
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

    // Director chat replies are free — credits are only charged on real
    // generations (generate-reference-image, generate-video).

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
