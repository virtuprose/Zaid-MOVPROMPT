// Curated catalogs powering the Marketing Studio (Higgsfield-inspired).
// Each entry contributes a prompt fragment that the studio composes into a
// final Seedance 2.0 prompt. Keep fragments short, directive, and audio-aware.

export type Subject = "product" | "app";

export type StudioPreset = {
  id: string;
  label: string;
  description: string;
  /** Short fragment woven into the final prompt. */
  fragment: string;
  /** Optional category tag for filtering. */
  category?: string;
  /** Optional emoji icon used as a thumbnail fallback. */
  emoji?: string;
};

export const FORMATS: StudioPreset[] = [
  {
    id: "ugc",
    label: "UGC",
    description: "Realistic social media videos",
    category: "ugc",
    emoji: "📱",
    fragment:
      "Handheld vertical UGC selfie style, natural daylight, casual presenter speaking directly to camera, authentic phone-shot look",
  },
  {
    id: "tutorial",
    label: "Tutorial",
    description: "Step-by-step product walkthrough",
    category: "ugc",
    emoji: "🧑‍🏫",
    fragment:
      "Top-down or shoulder POV tutorial, presenter demonstrating the steps clearly, clean kitchen/desk surface, bright even lighting",
  },
  {
    id: "unboxing",
    label: "Unboxing",
    description: "High-quality unboxing reveal",
    category: "commercial",
    emoji: "📦",
    fragment:
      "Macro unboxing on neutral surface, slow reveal of product, soft directional light, ASMR-grade tactile sound design",
  },
  {
    id: "hyper-motion",
    label: "Hyper Motion",
    description: "Cinematic high-energy product hero",
    category: "commercial",
    emoji: "💥",
    fragment:
      "Hyper-motion commercial, fast push-in to product hero, splash/particle FX, polished studio lighting, premium ad finish",
  },
  {
    id: "talking-avatar",
    label: "Talking Avatar",
    description: "Avatar speaks to camera",
    category: "ugc",
    emoji: "🗣️",
    fragment:
      "Single avatar talking head, eye-line locked to camera, subtle natural gestures, lips synced to a confident sales line",
  },
  {
    id: "before-after",
    label: "Before / After",
    description: "Side-by-side transformation",
    category: "commercial",
    emoji: "🔁",
    fragment:
      "Split-screen before/after transformation, smooth wipe between states, clear visual contrast, satisfying payoff frame",
  },
];

export const HOOKS: StudioPreset[] = [
  {
    id: "product-hit",
    label: "Product Hit",
    description: "Object flies into frame, brief reaction → pivot to product",
    category: "stunt",
    emoji: "🎯",
    fragment:
      "Hook: product flies into frame and lands in subject's hand, micro-shocked reaction, then confident smile",
  },
  {
    id: "spicy",
    label: "Spicy",
    description: "Extreme close-up that slowly pulls out",
    category: "subtle",
    emoji: "🌶️",
    fragment:
      "Hook: extreme close-up on a striking detail, slow pull-out reveals the full subject and product",
  },
  {
    id: "interview",
    label: "Interview",
    description: "Stranger interview based on a punchy question",
    category: "subtle",
    emoji: "🎙️",
    fragment:
      "Hook: street-interview opener, off-camera voice asks a punchy question, subject answers candidly",
  },
  {
    id: "random-object-mic",
    label: "Random Object Mic",
    description: "Absurd object falls in as the 'mic'",
    category: "stunt",
    emoji: "🎤",
    fragment:
      "Hook: an absurd object drops into frame and is used as a mic, comedic beat, then pivot to product talking point",
  },
  {
    id: "first-line",
    label: "Bold First Line",
    description: "Loud opening statement straight to camera",
    category: "subtle",
    emoji: "💬",
    fragment:
      "Hook: subject opens with a bold spoken first line directly to camera, no preamble",
  },
  {
    id: "pov-reveal",
    label: "POV Reveal",
    description: "Open on POV shot, snap to product",
    category: "stunt",
    emoji: "👀",
    fragment:
      "Hook: opens on first-person POV, fast snap-cut reveals the product on a surface in front of the viewer",
  },
];

export const SETTINGS: StudioPreset[] = [
  {
    id: "bedroom",
    label: "Bedroom",
    description: "On bed or against pillows, soft window light",
    category: "realistic",
    emoji: "🛏️",
    fragment:
      "Setting: cozy bedroom, propped against pillows, soft window daylight, lived-in styling",
  },
  {
    id: "kitchen",
    label: "Kitchen",
    description: "Modern kitchen counter, morning light",
    category: "realistic",
    emoji: "🍳",
    fragment:
      "Setting: bright modern kitchen counter, morning sunlight, clean styled background",
  },
  {
    id: "street",
    label: "Street",
    description: "Outdoor city street, foot traffic",
    category: "realistic",
    emoji: "🏙️",
    fragment:
      "Setting: busy urban street, golden hour light, candid passersby in soft background",
  },
  {
    id: "nature",
    label: "Nature",
    description: "Outdoor trail, park, or beach",
    category: "realistic",
    emoji: "🌿",
    fragment:
      "Setting: outdoors in nature, soft wind, dappled sunlight through leaves or open sky",
  },
  {
    id: "studio",
    label: "Studio",
    description: "Seamless backdrop, polished lighting",
    category: "realistic",
    emoji: "🎬",
    fragment:
      "Setting: seamless studio backdrop, two-light commercial setup, premium ad gloss",
  },
  {
    id: "rooftop",
    label: "Rooftop",
    description: "Skyscraper rooftop, city skyline",
    category: "unrealistic",
    emoji: "🌆",
    fragment:
      "Setting: skyscraper rooftop edge, city skyline, dramatic wind and depth",
  },
  {
    id: "airplane-wing",
    label: "Airplane Wing",
    description: "Sitting on a plane wing mid-flight",
    category: "unrealistic",
    emoji: "✈️",
    fragment:
      "Setting: subject perched on an airplane wing mid-flight at altitude, casual but surreal",
  },
  {
    id: "lava",
    label: "Volcano",
    description: "Lava field, intense surreal heat",
    category: "unrealistic",
    emoji: "🌋",
    fragment:
      "Setting: surreal lava field with glowing ground, heat haze, cinematic peril",
  },
];

export type BrandContext = {
  name?: string;
  description?: string;
  url?: string | null;
  tagline?: string | null;
  audience?: string | null;
};

export type LocationContext = {
  place?: string;
  hasImage?: boolean;
};

export type StudioBrief = {
  subject: Subject;
  master: string;
  formatId?: string;
  hookId?: string;
  settingId?: string;
  brand?: BrandContext;
  location?: LocationContext;
};

const find = (list: StudioPreset[], id?: string) =>
  id ? list.find((p) => p.id === id) : undefined;

function brandLine(b?: BrandContext): string | null {
  if (!b || !b.name) return null;
  const bits = [`Brand: ${b.name}`];
  if (b.description) bits.push(b.description);
  if (b.tagline) bits.push(`Tagline: "${b.tagline}"`);
  if (b.audience) bits.push(`Audience: ${b.audience}`);
  if (b.url) bits.push(`Ref: ${b.url}`);
  return bits.join(" — ");
}

function locationLine(l?: LocationContext): string | null {
  if (!l || (!l.place && !l.hasImage)) return null;
  const parts: string[] = [];
  if (l.place) parts.push(`Location: ${l.place} — match the city's architecture, light and cultural styling`);
  if (l.hasImage) parts.push("A reference photo of the real location is provided — match its look");
  return parts.join(". ");
}

export function composeStudioPrompt(brief: StudioBrief): string {
  const format = find(FORMATS, brief.formatId);
  const hook = find(HOOKS, brief.hookId);
  const setting = find(SETTINGS, brief.settingId);
  const subjectLine =
    brief.subject === "app"
      ? "Subject: a mobile app — feature its UI prominently on a phone screen held by the presenter."
      : "Subject: a physical product — feature it cleanly in-hand or on a hero surface.";

  const parts = [
    "Cinematic 9:16 social ad, 5 seconds, native audio.",
    subjectLine,
    brandLine(brief.brand),
    hook?.fragment,
    format?.fragment,
    setting?.fragment,
    locationLine(brief.location),
    brief.master.trim() ? `Story: ${brief.master.trim()}` : null,
    "End on a confident product hero frame. Keep text-on-screen minimal and legible.",
  ].filter(Boolean);

  return parts.join("\n");
}
