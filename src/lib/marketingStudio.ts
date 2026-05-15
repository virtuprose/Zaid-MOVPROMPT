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
  /** Optional cover image URL shown in preset cards. */
  image?: string;
};

const u = (id: string) =>
  `https://images.unsplash.com/${id}?w=600&auto=format&fit=crop&q=80`;

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
  // ── Realistic ──────────────────────────────
  {
    id: "bedroom",
    label: "Bedroom",
    description: "On bed or against pillows, soft window light",
    category: "realistic",
    image: u("photo-1505693416388-ac5ce068fe85"),
    fragment: "Setting: cozy bedroom, propped against pillows, soft window daylight, lived-in styling",
  },
  {
    id: "kitchen",
    label: "Kitchen",
    description: "Modern kitchen counter, morning light",
    category: "realistic",
    image: u("photo-1556909114-f6e7ad7d3136"),
    fragment: "Setting: bright modern kitchen counter, morning sunlight, clean styled background",
  },
  {
    id: "coffee-shop",
    label: "Coffee shop",
    description: "Café table, warm pendant lighting",
    category: "realistic",
    image: u("photo-1453614512568-c4024d13c247"),
    fragment: "Setting: cozy café interior, warm pendant lights, latte and laptop on the table",
  },
  {
    id: "restaurant",
    label: "Restaurant",
    description: "Editorial restaurant interior",
    category: "realistic",
    image: u("photo-1517248135467-4c7edcad34c4"),
    fragment: "Setting: stylish restaurant interior, low warm light, plated food, intimate dinner mood",
  },
  {
    id: "hotel-suite",
    label: "Hotel suite",
    description: "Luxe hotel room with city view",
    category: "realistic",
    image: u("photo-1611892440504-42a792e24d32"),
    fragment: "Setting: luxe hotel suite, floor-to-ceiling windows, city view, soft ambient light",
  },
  {
    id: "office",
    label: "Office desk",
    description: "Modern workspace, daylight",
    category: "realistic",
    image: u("photo-1497366216548-37526070297c"),
    fragment: "Setting: minimalist modern office desk, daylight from large window, focused workspace styling",
  },
  {
    id: "indoor-minimalist",
    label: "Indoor minimalist",
    description: "Bright neutral interior, clean lines",
    category: "realistic",
    image: u("photo-1505691938895-1758d7feb511"),
    fragment: "Setting: bright minimalist indoor space, neutral palette, clean architectural lines",
  },
  {
    id: "industrial-loft",
    label: "Industrial loft",
    description: "Concrete, brick, large windows",
    category: "realistic",
    image: u("photo-1554995207-c18c203602cb"),
    fragment: "Setting: industrial loft, exposed concrete and brick, oversized windows, moody daylight",
  },
  {
    id: "workshop",
    label: "Workshop",
    description: "Maker workshop, tools and craft",
    category: "realistic",
    image: u("photo-1556139943-4bdca53adf1e"),
    fragment: "Setting: artisan workshop, tools laid out on wood bench, warm task lighting, hands-on craft mood",
  },
  {
    id: "gym",
    label: "Gym / Studio",
    description: "Training space, dramatic lighting",
    category: "realistic",
    image: u("photo-1534438327276-14e5300c3a48"),
    fragment: "Setting: modern gym, dramatic side light, polished floor, athletic energy",
  },
  {
    id: "car-interior",
    label: "Car interior",
    description: "Driver POV, dashboard, golden hour",
    category: "realistic",
    image: u("photo-1492144534655-ae79c964c9d7"),
    fragment: "Setting: car interior from passenger angle, golden hour spilling through windshield, road blur outside",
  },
  {
    id: "street",
    label: "Street",
    description: "Outdoor city street, foot traffic",
    category: "realistic",
    image: u("photo-1502920917128-1aa500764cbd"),
    fragment: "Setting: busy urban street, golden hour light, candid passersby in soft background",
  },
  {
    id: "beach",
    label: "Beach",
    description: "Coastline, soft surf, warm sun",
    category: "realistic",
    image: u("photo-1507525428034-b723cf961d3e"),
    fragment: "Setting: sunlit beach, soft surf in background, warm directional sun, breezy textures",
  },
  {
    id: "garden",
    label: "Garden / Patio",
    description: "Lush greenery, sunlit patio",
    category: "realistic",
    image: u("photo-1416879595882-3373a0480b5b"),
    fragment: "Setting: lush garden patio, dappled sunlight through leaves, organic textures",
  },
  {
    id: "nature",
    label: "Nature",
    description: "Outdoor trail, park, or open sky",
    category: "realistic",
    image: u("photo-1441974231531-c6227db76b6e"),
    fragment: "Setting: outdoors in nature, soft wind, dappled sunlight through leaves or open sky",
  },
  {
    id: "outdoor-sunlit",
    label: "Outdoor sunlit",
    description: "Open exterior, harsh editorial sun",
    category: "realistic",
    image: u("photo-1500964757637-c85e8a162699"),
    fragment: "Setting: open outdoor location, hard editorial sunlight, deep clean shadows",
  },
  {
    id: "stadium",
    label: "Sports stadium",
    description: "Arena, crowd, stage lighting",
    category: "realistic",
    image: u("photo-1574629810360-7efbbe195018"),
    fragment: "Setting: large sports stadium, stage lighting on the field, crowd glow in background",
  },
  {
    id: "studio",
    label: "Studio",
    description: "Seamless backdrop, polished lighting",
    category: "realistic",
    image: u("photo-1547499389-92d9b95a5c5f"),
    fragment: "Setting: seamless studio backdrop, two-light commercial setup, premium ad gloss",
  },

  // ── Stylized / Unrealistic ─────────────────
  {
    id: "rooftop",
    label: "Rooftop",
    description: "Skyscraper rooftop, city skyline",
    category: "unrealistic",
    image: u("photo-1505968409348-bd000797c92e"),
    fragment: "Setting: skyscraper rooftop edge, city skyline, dramatic wind and depth",
  },
  {
    id: "penthouse",
    label: "Penthouse",
    description: "Luxe high-rise, glass walls, skyline",
    category: "unrealistic",
    image: u("photo-1600585154340-be6161a56a0c"),
    fragment: "Setting: glass-walled penthouse, sweeping skyline, luxe styling, blue hour glow",
  },
  {
    id: "pool",
    label: "Pool / Resort",
    description: "Infinity pool, resort vibe",
    category: "unrealistic",
    image: u("photo-1540541338287-41700207dee6"),
    fragment: "Setting: infinity pool at a luxury resort, turquoise water, palm shadows, golden hour",
  },
  {
    id: "city-night",
    label: "City night",
    description: "Neon-lit street, rain reflections",
    category: "unrealistic",
    image: u("photo-1480714378408-67cf0d13bc1b"),
    fragment: "Setting: neon-lit city street at night, wet asphalt reflections, cinematic anamorphic glow",
  },
  {
    id: "airplane-wing",
    label: "Travel / Airplane",
    description: "Above the clouds, surreal travel",
    category: "unrealistic",
    image: u("photo-1488646953014-85cb44e25828"),
    fragment: "Setting: surreal travel scene above the clouds, soft pastel light, dreamlike altitude",
  },
  {
    id: "lava",
    label: "Volcano",
    description: "Lava field, intense surreal heat",
    category: "unrealistic",
    image: u("photo-1462332420958-a05d1e002413"),
    fragment: "Setting: surreal lava field with glowing ground, heat haze, cinematic peril",
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
