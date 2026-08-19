# MovPrompt premium creative engine

## What is implemented

MovPrompt now ships a structured catalog of 50 distinct Kuwait campaign
categories in `packages/creative-engine/src/catalog.ts`. A template is not a
display card. Each immutable recipe includes:

- Target vertical and conversion goal.
- Three to five time-balanced scenes.
- Shot, camera, lighting and continuity direction.
- English and Kuwait-Arabic headlines and voiceover.
- Protected identity, logo, price, offer, CTA and subtitle layers.
- Compliance rules and required source inputs.
- A premium acceptance score and two internal quality retries.
- Four ratios and Arabic, English and bilingual output policies.

The same recipes are published into PostgreSQL through
`0007_kuwait_campaign_catalog.sql`, returned by the public template API and
used by the web creator. Templates remain in `review` until they have unique
real previews and pass the frozen benchmark; code completion alone does not
change them to `approved`.

## Kuwaiti Arabic, not generic Arabic

`packages/creative-engine/src/kuwaiti-arabic.ts` applies a versioned
`ar-KW-campaign-2026.08` policy with five controls:

1. The campaign locale is explicitly `ar-KW`.
2. The copy compiler uses a controlled Kuwait lexicon and polished or
   conversational register.
3. Cross-dialect leakage from common Egyptian, Levantine, Maghrebi, Iraqi and
   Saudi campaign phrasing is detected, normalized and reported.
4. Over-formal MSA conversion phrases are rewritten for conversational
   campaigns while clinic copy keeps a factual polished register.
5. Provider submission is blocked when the complete script score is below 90;
   all fifty template scripts are covered by this preflight test.

Arabic text, KWD price, offer, CTA and subtitles are protected deterministic
layers. The video model is not trusted to draw legible Arabic text into the
generated footage. For ordinary product and service templates, speech is also
deterministic: the final encoder replaces provider dialogue with the approved
script synthesized through an explicit `ar-KW` voice. Only Azure's
`ar-KW-NouraNeural` or `ar-KW-FahedNeural` is accepted for Arabic campaigns;
a Saudi, Emirati, Egyptian or generic Arabic voice cannot be configured.

Presenter and UGC templates are different: a detached TTS track would break
mouth synchronization. Those templates request provider-native synchronized
dialogue using the exact approved script, keep that native audio, and must pass
both Kuwait-dialect and speech-sync evidence. They never receive a detached
post-generation voice overlay. Automated video review is a screening gate;
final presenter approval still requires Kuwait-based human listening and
lip-sync review.

Azure publishes the dedicated Kuwait voices and supports multiple voices in
one SSML document for alternating bilingual scenes; voice quality still
requires the live human benchmark:
<https://learn.microsoft.com/azure/ai-services/speech-service/language-support>.
<https://learn.microsoft.com/azure/ai-services/speech-service/speech-synthesis-markup-voice>.

Kuwaiti Arabic is treated as a distinct dialect rather than a Gulf-Arabic
label. This follows dialect-corpus research including MADAR and Gumar:
<https://aclanthology.org/L18-1535/> and
<https://aclanthology.org/L16-1679/>.
The first published conversational Kuwaiti Arabic WhatsApp corpus also shows
that Kuwaiti Arabic is low-resource and socially variable, so the product
policy is intentionally versioned and still requires Kuwait-based human review
rather than presenting a small replacement dictionary as a complete linguistic
classifier: <https://aclanthology.org/2022.wanlp-1.35/>.

## Accepted-output engine

The worker compiles the structured brief into a provider-ready, timecoded
direction with product lock, continuity anchors, safe zones, negative
constraints and an approved Kuwait voice script.

Every completed provider candidate is copied to MovPrompt-owned storage before
review. Provider files are normalized through FFmpeg to MP4/H.264/AAC with
fast-start metadata before they are eligible for acceptance. Independent
analyzers must supply evidence for:

- Technical validity.
- Product/business identity.
- Prompt adherence.
- Motion realism.
- Visual artifacts.
- Brand safety.
- Kuwaiti dialect fidelity.
- Visible-speech synchronization when a presenter speaks.
- Overlay safe zones.
- Compliance.

Missing evidence scores zero, so a partially configured reviewer fails closed.
Rejected candidates are stored in `render_attempts`. Up to two targeted quality
retries use new provider idempotency keys and durable outbox jobs without a
second user charge. Only an accepted attempt becomes the render output. If no
attempt passes, the existing exactly-once refund or starter-entitlement restore
path applies.

### Executable provider and review path

`packages/providers/src/byteplus-seedance.ts` implements the official
asynchronous BytePlus ModelArk task contract for Dreamina Seedance 2.0:

- Server-only model and API credentials.
- Text plus signed private image, video and audio references.
- Native audio, ratio, resolution and watermark controls.
- Durable provider task IDs, polling, terminal errors and queued cancellation.
- No provider or model IDs in browser/public contracts.

`apps/worker/src/media-quality-analyzers.ts` combines two independent checks:

- FFprobe validates the real duration, streams, dimensions, frame cadence and
  H.264/AAC delivery.
- Azure Speech renders the approved Kuwait-Arabic script, and FFmpeg replaces
  provider dialogue during deterministic delivery encoding.
- A Google Gemini language model routed through Vercel AI Gateway receives the
  bounded MP4 FilePart, confirmed brief and up to five product references, then
  returns schema-validated evidence for identity, prompt adherence, motion,
  artifacts, brand safety, Kuwaiti dialect, visible speech sync, safe zones and
  compliance. It reuses the Gateway key and never calls a provider-specific
  Files API or silently falls back to another model.

The worker registers the Seedance adapter only when storage, an exact output
host allowlist, the provider key, the explicit Gateway quality model and both
capability configuration values are present. Missing any one keeps generation
fail-closed.

## Production activation gate

The engine intentionally has no default provider. A live adapter stays disabled
until all 48 frozen briefs are run and the adapter meets the quality,
reliability, latency, rights and accepted-output-cost gates in
`BENCHMARK_CORPUS.md`. Current provider availability, model versions, quality
and pricing must be measured live; a marketing page or recalled model name is
not activation evidence.

The gate is executable: `benchmark:prepare` validates and uploads sixteen
rights-attested private subject packs into the fixed 48-brief manifest, and
`benchmark:live` resumes accepted provider task IDs, stores every paid
observation, and refuses approval for missing, duplicate or partial coverage.

Current primary API references used by the implementation:

- BytePlus create/retrieve task API:
  <https://docs.byteplus.com/en/docs/modelark/1520757> and
  <https://docs.byteplus.com/en/docs/ModelArk/1521309>.
- AI SDK structured output and Vercel AI Gateway:
  <https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data> and
  <https://vercel.com/docs/ai-gateway>.
