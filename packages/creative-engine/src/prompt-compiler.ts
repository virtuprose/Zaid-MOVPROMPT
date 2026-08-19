import { compileKuwaitiCampaignCopy, voiceDirection } from "./kuwaiti-arabic.js";
import { templateRequiresSynchronizedSpeech } from "./catalog.js";
import { CreativeBriefSchema, type CompiledCreativeDirection } from "./types.js";

const NEGATIVE_PROMPT = [
  "changed product shape, label, logo, packaging, colour or proportions",
  "invented product feature, medical claim, qualification, price, discount or result",
  "baked-in text, fake typography, misspelled Arabic, subtitles, watermark or user interface",
  "extra fingers, warped hands, duplicated objects, rubber motion, flicker, frame tearing or sudden identity drift",
  "unmotivated camera movement, impossible reflections, floating props or inconsistent lighting",
].join(", ");

function seconds(value: number): string {
  return `${value.toFixed(1)}s`;
}

export function compileCreativeDirection(input: {
  rawPrompt: string;
  creativeBrief: unknown;
  audioEnabled?: boolean;
  qualityAttempt?: number;
  retryDirective?: string;
}): CompiledCreativeDirection {
  const brief = CreativeBriefSchema.parse(input.creativeBrief);
  const audioEnabled = input.audioEnabled ?? true;
  const requiresSynchronizedSpeech = templateRequiresSynchronizedSpeech(brief.templateId);
  const kuwaiti = brief.language === "en" ? null : compileKuwaitiCampaignCopy(brief);
  let cursor = 0;
  const shots = brief.scenes.map((scene, index) => {
    const start = cursor;
    cursor += scene.duration;
    const localized = kuwaiti?.scenes[index];
    const spoken = brief.language === "en" ? scene.voiceover.en : localized?.voiceover ?? scene.voiceover.ar;
    return [
      `SHOT ${index + 1} · ${seconds(start)}–${seconds(cursor)} · ${scene.title.en}`,
      `Purpose: ${scene.purpose.en}`,
      `Visual action: ${scene.direction}`,
      `Framing: ${scene.shot}. Camera: ${scene.camera}. Lighting: ${scene.lighting}.`,
      `Continuity: ${scene.continuityAnchor}`,
      audioEnabled
        ? `Spoken line: ${spoken}`
        : `Approved copy context (do not speak or render as text): ${spoken}`,
      "Keep clean negative space for deterministic text overlays; render no text inside the generated footage.",
    ].join("\n");
  });

  const factualLock = [
    `Subject name: ${brief.product.name}`,
    brief.product.brand ? `Brand: ${brief.product.brand}` : "Brand: not supplied; do not invent one",
    brief.product.description ? `Confirmed description: ${brief.product.description}` : "Description: not supplied",
    brief.product.price ? `Confirmed price: ${brief.product.price} KWD` : "Price: not supplied; never invent a price",
    brief.product.offer ? `Confirmed offer: ${brief.product.offer}` : "Offer: not supplied; never invent an offer",
    `Confirmed call to action: ${brief.product.callToAction}`,
    brief.product.whatsapp ? `Confirmed WhatsApp destination: ${brief.product.whatsapp}` : "WhatsApp destination: not supplied",
    brief.product.location ? `Confirmed location: ${brief.product.location}` : "Location: not supplied",
  ].join("\n");

  const retry = input.qualityAttempt && input.qualityAttempt > 0
    ? `QUALITY RETRY ${input.qualityAttempt}: ${input.retryDirective || "Simplify motion and strengthen identity continuity without changing the campaign facts."}`
    : "FIRST QUALITY PASS: prioritise product identity, physical realism and shot-to-shot continuity over decorative complexity.";

  const prompt = [
    `MOVPROMPT PREMIUM CAMPAIGN ENGINE · ${brief.engineVersion}`,
    retry,
    "NON-NEGOTIABLE PRODUCT AND BUSINESS TRUTH",
    factualLock,
    "REFERENCE POLICY",
    "Treat supplied product references as an exact digital identity lock. Preserve silhouette, packaging geometry, label placement, logo, colour and material. Treat people and locations as continuity references only when explicitly supplied.",
    "CAMPAIGN DIRECTION",
    input.rawPrompt.trim(),
    `Tone: ${brief.tone}. Market: Kuwait. Format: conversion-ready social campaign.`,
    "SHOT PLAN",
    ...shots,
    "AUDIO AND LANGUAGE",
    brief.language === "en"
      ? "Natural English voice and locally neutral Kuwait-market delivery."
      : voiceDirection(brief.tone, brief.dialectRegister),
    kuwaiti ? `Approved ar-KW voice script: ${kuwaiti.fullVoiceover}` : "",
    !audioEnabled
      ? "MUTED OUTPUT: generate no speech, dialogue, music or sound effects. Do not show a person visibly speaking or moving their mouth as if speaking."
      : requiresSynchronizedSpeech
        ? "SYNCHRONIZED PRESENTER SPEECH: any visible speaking person must deliver the exact approved line with natural phoneme-to-mouth timing and provider-native synchronized audio. Never create silent talking, detached dubbing or a different script."
        : "VOICEOVER SEPARATION: do not show a person visibly speaking; preserve clean visuals for the deterministic campaign voice track added after generation.",
    "FINISHING STANDARD",
    "Photoreal commercial finish, physically plausible motion, coherent geography, motivated key/fill/rim lighting, stable exposure and colour, clean edit points, premium sound perspective and intentional pacing.",
    `NEGATIVE CONSTRAINTS: ${NEGATIVE_PROMPT}.`,
  ].filter(Boolean).join("\n\n");

  if (prompt.length > 8_000) throw new Error("compiled_prompt_exceeds_provider_contract");
  return {
    prompt,
    negativePrompt: NEGATIVE_PROMPT,
    spokenLocale: brief.language === "en" ? "en-US" : brief.language === "ar" ? "ar-KW" : "mixed",
    dialectScore: kuwaiti?.score ?? 100,
    dialectWarnings: kuwaiti?.warnings ?? [],
    dialectPolicyVersion: kuwaiti?.policyVersion ?? "not-applicable",
    qualityPolicy: brief.qualityPolicy,
  };
}
