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
  /** Optional cover video URL (autoplay/muted/loop) shown in preset cards. */
  video?: string;
};

const u = (id: string) =>
  `https://images.unsplash.com/${id}?w=600&auto=format&fit=crop&q=80`;

export const FORMATS: StudioPreset[] = [
  // ── UGC / social ────────────────────────────
  {
    id: "ugc",
    label: "UGC",
    description: "Phone-shot, talking-to-camera selfie",
    category: "ugc",
    image: u("photo-1611162616305-c69b3fa7fbe0"),
    fragment:
      "Handheld vertical UGC selfie style, natural daylight, casual presenter speaking directly to camera, authentic phone-shot look",
  },
  {
    id: "tutorial",
    label: "Tutorial",
    description: "Step-by-step product walkthrough",
    category: "ugc",
    image: u("photo-1556909114-f6e7ad7d3136"),
    fragment:
      "Top-down or shoulder POV tutorial, presenter demonstrating the steps clearly, clean kitchen/desk surface, bright even lighting",
  },
  {
    id: "unboxing",
    label: "Unboxing",
    description: "Top-down hands-on reveal",
    category: "ugc",
    image: u("photo-1607083206869-4c7672e72a8a"),
    fragment:
      "Macro unboxing on neutral surface, slow reveal of product, soft directional light, ASMR-grade tactile sound design",
  },
  {
    id: "testimonial",
    label: "Testimonial",
    description: "Customer talking head, candid",
    category: "ugc",
    image: u("photo-1573496359142-b8d87734a5a2"),
    fragment:
      "Customer testimonial talking head, soft natural light, candid eye contact, sincere delivery of one key benefit",
  },
  {
    id: "reaction",
    label: "Reaction",
    description: "Real-time reaction to a reveal",
    category: "ugc",
    image: u("photo-1543610892-0b1f7e6d8ac1"),
    fragment:
      "Reaction format: subject reacts in real time to seeing or using the product, exaggerated honest expression, quick cuts",
  },
  {
    id: "pov",
    label: "POV",
    description: "First-person point-of-view",
    category: "ugc",
    image: u("photo-1502920917128-1aa500764cbd"),
    fragment:
      "First-person POV throughout, hands enter frame to interact with the product, immersive everyday environment",
  },

  // ── Commercial / brand ──────────────────────
  {
    id: "hyper-motion",
    label: "Speed Reveal",
    description: "FPV-velocity 4–6 sequence commercial ending in a sudden stop hero reveal",
    category: "commercial",
    image: u("photo-1551582045-6ec9c11d8697"),
    video: "/presets/speed-reveal.mp4",
    fragment:
      "High-kinetic cinematic commercial, 8k resolution, FPV drone physics, extreme speed-ramping (fast-slow-fast), seamless spatial transitions, motion blur, hyper-dynamic camera angles, high-end motion control rig aesthetic. Build 4–6 sequences that never break kinetic momentum until the final frame, always ending with The Sudden Stop Reveal. Sequence 1 (The FPV Dive): high-velocity establishing shot, camera behaves like an FPV drone diving rapidly from the sky or a high vantage point directly toward the product, surroundings blur with intense speed before snapping into sharp focus right in front of the hero. Sequence 2 (The Speed Ramp Detail): camera rapidly orbits the product, mid-spin the footage speed-ramps into extreme 1000fps slow-motion to highlight a specific premium feature (a splash of liquid, a glowing LED, a mechanical click), then the camera instantly whips away at high speed. Sequence 3 (The Portal Transition): camera executes a rapid push-in, flying directly into a dark or reflective part of the product (through a glass lens, into a drop of condensation, through a vent) which acts as a seamless portal instantly transitioning out into a completely new contrasting secondary environment. Sequence 4 (The Kinetic Match-Cut — optional): product moves rapidly across the frame; every time it passes behind a foreground object (pillar, splash of element), the background and the product's color/variation instantly match-cut to a new version while maintaining the exact same trajectory and speed. Sequence 5 (The Reverse Pull-out — optional): camera, currently inside the product's internal mechanics or texture, suddenly flies backward in reverse at high speed, seamlessly zooming out through the outer shell to reveal the full product mid-air spinning dynamically. Sequence 6 (The Sudden Stop Reveal): camera is pulling back at maximum velocity from the product, then hits a dead-stop on a dime, all motion blur vanishes instantly, leaving a crisp brilliantly lit perfect 8k wide hero shot of the product frozen center-frame against a premium color/texture backdrop. Premium, high-impact, million-dollar finish.",
  },
  {
    id: "hype-motion",
    label: "Hype Motion",
    description: "4-sequence high-budget commercial: texture, kinetic ingredients, fluid splash, reveal",
    category: "commercial",
    image: u("photo-1625772452859-1c03d5bf1137"),
    video: "/presets/cinematic-ai-director.mp4",
    fragment:
      "Hyper-realistic 3D product commercial, 8k, high-speed phantom camera at 1000fps slow-motion, cinematic studio lighting. Sequence 1 (Texture): extreme macro close-up panning over the product, hyper-detailed surface textures (condensation, finish, micro-detail). Sequence 2 (Kinetic Ingredients): zero-gravity explosion of raw ingredients and key props colliding mid-air in crisp photorealistic detail against a clean color backdrop. Sequence 3 (Fluid Dynamics): massive sweeping high-speed liquid splash erupts and spirals around the product, camera zooms rapidly through the center of the splash. Sequence 4 (The Reveal): wide hero shot of the product in its final packaging, perfectly lit, suspended center-frame, surrounded by slowly falling ingredients and props. Premium, vibrant, million-dollar production value",
  },
  {
    id: "tactile-stopmotion",
    label: "Tactile Stop-Motion",
    description: "Handcrafted claymation/papercraft diorama, 4–6 sequences ending in a reveal",
    category: "commercial",
    image: u("photo-1559191669-e1b3a2c0a3ab"),
    video: "/presets/tactile-stopmotion.mp4",
    fragment:
      "Premium tactile stop-motion commercial, 8k resolution, miniature set design, tilt-shift macro photography, warm studio micro-lighting, 12fps staccato animation style, hyper-detailed handmade textures (clay, construction paper, felt, balsa wood, fabric). Sequence 1 (The Miniature Stage): macro shot of a handcrafted diorama made of pastel seamless paper and textured felt, miniature studio lights flicker on, environment sets the mood for the product. Sequence 2 (Frame-by-Frame Assembly): the product builds itself in a snappy frame-by-frame sequence, individual pieces of smooth polymer clay and laser-cut wood slide, pop and stack together with visible charming imperfection. Sequence 3 (Material Morphing): key ingredients introduced through tactile morphing — a ball of clay rolls in and squashes into an ingredient shape, colliding with another and bursting into a shower of paper confetti and wool tufts. Sequence 4 (Playful Interaction): the product scoots across the felt surface leaving a physical trail, a miniature invisible hand visibly adjusts its position in classic stop-motion stutter. Sequence 5 (Tactile Macro): extreme macro tilt-shift close-up on the product's surface, focus on paper grain, clay thumbprints and stray felt fibers, highlighting the handmade artisanal quality. Sequence 6 (The Diorama Reveal): wide hero pull-back to the completed product perfectly framed in its miniature handmade set, crafted props suspended on visible wires in the background. Premium, artisanal, highly tactile production value.",
  },
  {
    id: "hero-shot",
    label: "Hero Shot",
    description: "Single dramatic product reveal",
    category: "commercial",
    image: u("photo-1542291026-7eec264c27ff"),
    video: "/presets/hero-shot.mp4",
    fragment:
      "Elite $1M-production Hero Shot reveal — epic, iconic, monolithic product reveal in the spirit of luxury car or flagship tech launches. Style directive: cinematic epic reveal, 8k photorealistic, anamorphic lens aesthetic, ultra-slow motion (1000fps+), dramatic high-contrast lighting (volumetric rim light, lens flares, God rays), intense atmosphere (swirling smoke, particle dust), blockbuster CGI physics. Treat the product as a monumental object or legendary character. Build 4–6 sequences ALWAYS ending with The Ultimate Hero Reveal: (1) The Tease / Build-up — tight macro on a mysterious pristine detail, slow rotation, only hints of shape revealed by sweeping dramatic rim lighting in moody atmospheric setting (swirling smoke, deep shadows); (2) Kinetic Power Introduction — ultra-slow-motion tracking shot, a high-speed blast of an element (water droplets, fire, lightning, particle dust) is unleashed and barely misses the pristine surface, emphasizing durability and power; (3) Monolithic Scale — extreme low-angle tracking shot sweeping upwards, the product looms over the camera like a massive monolithic monument, volumetric light and God rays pierce the atmosphere highlighting premium craftsmanship and colossal scale; (4) The Precision Detail (optional) — fast-paced intense macro montage, rapid-fire cuts of textures, logo, materials snapping together with mechanical precision under sharp brilliant light; (5) The Action Burst (optional) — dynamic bullet-time tracking move around the product as it performs an action (opening, activating), debris and particles fly around it frozen in slow motion; (6) The Ultimate Hero Reveal — final iconic wide shot, product perfectly centered bathed in triumphant golden or brilliantly white God lighting, camera slowly pulls back revealing the product standing solitary and powerful within an epic breathtaking landscape (cliffside at sunset, futuristic vault). Legendary, undisputed production value.",
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    description: "Product woven into daily life",
    category: "commercial",
    image: u("photo-1490481651871-ab68de25d43d"),
    video: "/presets/lifestyle.mp4",
    fragment:
      "Elite $1M-production lifestyle commercial — 8k full-frame Sony FX3/A1 color science, Sigma prime shallow DOF, smooth Steadicam, natural golden-hour or high-end architectural light, authentic candid talent. Build 4–6 sequences ending on The Lifestyle Hero: (1) The Vibe — beautifully composed establishing shot of talent in an aspirational setting, atmosphere before product reveal; (2) The Organic Introduction — medium shot, talent seamlessly brings the product into their routine with genuine anticipation; (3) Sensory Interaction — close-up of tactile use, sun flare catching the moment, background blurred; (4) Shared Experience (optional) — friends/partner join, spontaneous laughter, product naturally part of the moment; (5) Detail in Motion (optional) — dynamic tracking shot on a premium product detail mid-use; (6) The Lifestyle Hero — wide cinematic hero, talent confident and relaxed, product prominently and naturally placed. Focus on human connection, authentic emotion, organic movement, cinematic depth.",
  },
  {
    id: "fashion-dream",
    label: "Fashion Dream",
    description: "6-sequence luxury fashion lifestyle: fantasy world, elite community, lifestyle hero",
    category: "commercial",
    image: u("photo-1490481651871-ab68de25d43d"),
    video: "/presets/fashion-dream.mp4",
    fragment:
      "Elite $1M-production cinematic luxury lifestyle commercial — 8k resolution, high-fashion editorial aesthetic, elegant atmosphere, soft volumetric lighting, smooth Steadicam movement, ethereal light, cinematic shallow depth of field, premium brand feel in the spirit of Chanel, Ralph Lauren, Gucci. Build 6 sequences ALWAYS ending with The Lifestyle Hero: (1) The Fantasy / Establishing — beautifully composed establishing shot setting the mood in an elegant high-status location, lighting highlights the atmosphere before the product is fully revealed; (2) The Elegant Introduction — talent seamlessly introduces the product into their routine with natural candid movement, medium shot with an aura of exclusivity and sophistication; (3) Sensory Luxury — close-up on the tactile sensory experience of using the product, camera catches a sun flare during the interaction, shallow depth of field blurs the beautiful background; (4) The Elite Community — narrative expands to friends or a partner in the setting, spontaneous laughter and organic conversation, the product is a natural part of this shared joyful moment, resting on a table or passed between hands; (5) The Detail in Motion — dynamic tracking shot focusing on a specific premium detail of the product while it is actively in motion or being used (sunlight catching the rim of a glass, fabric flowing as the talent spins); (6) The Lifestyle Hero — wide cinematic hero shot tying the whole narrative together, talent looking confident and relaxed in the beautiful setting, product prominently and naturally placed in the frame; the camera settles, then the brand wordmark/logo (sourced from the brand reference image) fades in elegantly over the hero frame as a clean END-CARD — centered or lower-third, rendered in the brand's typography vibe and palette, held for ~1s before a gentle fade out. This end-card logo beat is MANDATORY — the final frame must visibly show the brand wordmark/logo. Aspirational, narrative-driven, exclusive social community feel, million-dollar production value.",
  },
  {
    id: "cinematic-fashion",
    label: "Cinematic Fashion",
    description: "6-sequence narrative-driven cinematic fashion film: Sony Venice, location-scouted, cinematic hero",
    category: "commercial",
    image: u("photo-1483985988355-763728e1935b"),
    video: "/presets/cinematic-fashion.mp4",
    fragment:
      "Elite $1M-production cinematic fashion film commercial — 8k resolution, Sony Venice color science, specialized prime lenses, classic commercial look, low contrast ratio, meticulous location-driven narrative, emotion-driven aspirational lifestyle. Build 6 sequences ALWAYS ending with The Cinematic Hero: (1) The Meticulously Scouted Location / Establishing — beautifully composed establishing shot setting the mood, brief action showcasing the narrative environment, lighting highlights the atmosphere before the product is fully revealed, cinematic low contrast ratio; (2) The Narrative Introduction — talent seamlessly introduces the product into their routine with natural candid movement, medium shot of the talent in action captured with specialized cinema prime lenses for a classic commercial look; (3) Sensory Texture — close-up focusing on the tactile sensory experience of using the product, camera catches a sun flare as the talent interacts, shallow depth of field blurs the beautiful background; (4) The Storyboarded Interaction — narrative expands to include friends or a partner in the setting, spontaneous laughter and organic conversation, the product is a natural part of this shared joyful moment, resting on a table or passed between hands; (5) The Detail in Motion — dynamic tracking shot focusing on a specific premium detail of the product while actively in motion or being used (sunlight catching the rim of a glass, fabric flowing as the talent spins); (6) The Cinematic Hero — wide cinematic hero shot tying the whole narrative together, talent looking confident and relaxed in the beautiful setting, product prominently and naturally placed in the frame; the shot ends on a tasteful brand END-CARD where the brand wordmark/logo (sourced from the brand reference image) fades in over the final hero frame — centered or lower-third, rendered in the brand's typography vibe and palette, held briefly, then a gentle fade out. This end-card logo beat is MANDATORY — the final frame must visibly show the brand wordmark/logo. Aspirational, narrative-driven, premium brand feel, million-dollar production value.",
  },
  {
    id: "before-after",
    label: "Before / After",
    description: "Side-by-side transformation",
    category: "commercial",
    image: u("photo-1517694712202-14dd9538aa97"),
    video: "/presets/before-after.mp4",
    fragment:
      "Elite $1M-production before/after transformation commercial — cinematic 8k photorealistic storytelling, high-contrast emotional shift, dramatic transition effects, precise macro and wide-angle cinematography. CRITICAL TIMING RULE: split the total duration exactly in half. Sequences 1–3 (Problem + Catalyst + Process) occupy the FIRST 50% of the clip. The Reveal Transition lands precisely at the MIDPOINT (50% mark) of the video — NOT in the final second. Sequences 5–6 (Confident After + Transformation Hero) occupy the FINAL 50% so the 'After' state holds for half the duration. Build 4–6 sequences: (1) The Problem State — establish the negative 'before' with dim, cool or uneven lighting (macro of aged/cracked/dirty surface, frustrated person in a cluttered room); (2) The Catalyst (optional) — high-speed macro close-up of the product being applied or activated, the exact moment interaction begins (first drop of serum hitting the surface, power button pressed); (3) The Process In Motion — fast-paced montage with dynamic tracking shots or time-lapse showing the product actively working (dirt lifting, fabric smoothing, space de-cluttering); (4) The Reveal Transition — executed at the EXACT MIDPOINT of the video (not the end), describe the exact visual mechanism (vertical wipe left-to-right erasing the dullness, seamless morph, or camera pan from 'before' into 'after'), lighting shifts from dim to radiant and warm; (5) The Confident After — medium shot or close-up of the subject looking satisfied/happy, highlight the new quality (glow of skin, sheen of surface, calm of space), occupying the third quarter of the clip; (6) The Transformation Hero — held for the entire final quarter ending on an iconic wide shot or split-screen with 'Before' left and 'After' right, clean graphic demarcation, perfectly framed and lit, undeniable premium transformation.",
  },
  {
    id: "day-in-life",
    label: "Day in the Life",
    description: "Vlog-style routine featuring the product",
    category: "ugc",
    image: u("photo-1499951360447-b19be8fe80f5"),
    fragment:
      "Day-in-the-life vlog cut, natural light through the day, the product appears at key moments of the routine",
  },

  // ── Avatar / animated ───────────────────────
  {
    id: "talking-avatar",
    label: "Talking Avatar",
    description: "Avatar speaks to camera",
    category: "avatar",
    image: u("photo-1494790108377-be9c29b29330"),
    fragment:
      "Single avatar talking head, eye-line locked to camera, subtle natural gestures, lips synced to a confident sales line",
  },
  {
    id: "animated-explainer",
    label: "Animated Explainer",
    description: "Motion-graphic explainer",
    category: "animated",
    image: u("photo-1620712943543-bcc4688e7485"),
    fragment:
      "Animated explainer style, clean motion graphics, bold typography, illustrated icons walk through the value prop",
  },
];

export const HOOKS: StudioPreset[] = [
  // ── Surprise ────────────────────────────────
  {
    id: "product-hit",
    label: "Product Hit",
    description: "Object flies into frame, beat reaction",
    category: "surprise",
    image: u("photo-1542291026-7eec264c27ff"),
    fragment:
      "Hook: product flies into frame and lands in subject's hand, micro-shocked reaction, then confident smile",
  },
  {
    id: "random-object-mic",
    label: "Random Object Mic",
    description: "Absurd object drops in as the 'mic'",
    category: "surprise",
    image: u("photo-1485579149621-3123dd979885"),
    fragment:
      "Hook: an absurd object drops into frame and is used as a mic, comedic beat, then pivot to product talking point",
  },
  {
    id: "pattern-interrupt",
    label: "Pattern Interrupt",
    description: "Unexpected visual jolt in frame 1",
    category: "surprise",
    image: u("photo-1496111367193-b1c4cdfa6b39"),
    fragment:
      "Hook: pattern-interrupt opener — an unexpected visual or sound jolt in the very first frame to stop the scroll",
  },

  // ── Curiosity ───────────────────────────────
  {
    id: "spicy",
    label: "Mystery Macro",
    description: "Extreme close-up that pulls out",
    category: "curiosity",
    image: u("photo-1556228720-195a672e8a03"),
    fragment:
      "Hook: extreme close-up on a striking detail, slow pull-out reveals the full subject and product",
  },
  {
    id: "pov-reveal",
    label: "POV Reveal",
    description: "Open on POV, snap to product",
    category: "curiosity",
    image: u("photo-1502920917128-1aa500764cbd"),
    fragment:
      "Hook: opens on first-person POV, fast snap-cut reveals the product on a surface in front of the viewer",
  },
  {
    id: "question",
    label: "Open Question",
    description: "Punchy question straight to camera",
    category: "curiosity",
    image: u("photo-1573497019940-1c28c88b4f3e"),
    fragment:
      "Hook: subject asks a punchy, specific question directly to camera that the rest of the ad answers",
  },
  {
    id: "interview",
    label: "Street Interview",
    description: "Stranger answers a sharp question",
    category: "curiosity",
    image: u("photo-1521737604893-d14cc237f11d"),
    fragment:
      "Hook: street-interview opener, off-camera voice asks a punchy question, subject answers candidly",
  },

  // ── Bold claim ──────────────────────────────
  {
    id: "first-line",
    label: "Bold First Line",
    description: "Loud opening statement",
    category: "bold-claim",
    image: u("photo-1535713875002-d1d0cf377fde"),
    fragment:
      "Hook: subject opens with a bold spoken first line directly to camera, no preamble",
  },
  {
    id: "statistic-shock",
    label: "Statistic Shock",
    description: "Surprising number on screen",
    category: "bold-claim",
    image: u("photo-1551288049-bebda4e38f71"),
    fragment:
      "Hook: a surprising statistic slams onto screen with bold typography and a hard sound cue, voiceover reads it",
  },
  {
    id: "comparison",
    label: "Comparison",
    description: "Us vs. them, instant contrast",
    category: "bold-claim",
    image: u("photo-1517694712202-14dd9538aa97"),
    fragment:
      "Hook: instant comparison frame — ours vs theirs side by side, the difference is obvious within one second",
  },

  // ── Emotional ───────────────────────────────
  {
    id: "before-after-teaser",
    label: "Before/After Teaser",
    description: "Tease the transformation up front",
    category: "emotional",
    image: u("photo-1521572267360-ee0c2909d518"),
    fragment:
      "Hook: tease the after-state in the very first beat, then cut to the before — emotional payoff promised early",
  },
  {
    id: "vulnerable-moment",
    label: "Vulnerable Moment",
    description: "Quiet, honest confession",
    category: "emotional",
    image: u("photo-1488161628813-04466f872be2"),
    fragment:
      "Hook: quiet vulnerable moment, soft handheld, subject shares a real frustration that the product addresses",
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
  category?: string | null;
  visual_parts?: string | null;
  materials?: string | null;
  hero_colors?: string[] | null;
  packaging?: string | null;
  /** Ordered labels for additional angle reference images (front, back, packaging, …). */
  angle_labels?: string[];
};

export type LocationContext = {
  place?: string;
  hasImage?: boolean;
};

export type CharacterContext = {
  name: string;
  description?: string | null;
  role?: string | null;
  hasImage?: boolean;
  /** "face" = lock face only (outfit flexible). "full" = lock face + body + outfit from the reference. */
  shot_type?: "face" | "full";
};


export type BrandIdentityContext = {
  primary_color?: string | null;
  supporting_colors?: string[] | null;
  avoid_colors?: string[] | null;
  typography_vibe?: string | null;
  font_hint?: string | null;
  mood_notes?: string | null;
  tagline?: string | null;
  lighting_style?: string | null;
  finish_vibe?: string | null;
  pacing?: string | null;
  logo_treatment?: string | null;
  brand_voice?: string | null;
  industry?: string | null;
};

export type StudioBrief = {
  subject: Subject;
  master: string;
  formatId?: string;
  settingId?: string;
  /** Free-text format description used when no preset is picked. */
  customFormat?: string;
  /** Free-text scene description used when no preset is picked. */
  customSetting?: string;
  /** Single brand (legacy). Prefer `brands`. */
  brand?: BrandContext;
  /** Ordered list of attached brands/products (first = hero). */
  brands?: BrandContext[];
  location?: LocationContext;
  /** Single character (legacy). Prefer `characters`. */
  character?: CharacterContext;
  /** Ordered list of on-camera people (first = lead). */
  characters?: CharacterContext[];
  /**
   * Ordered list of reference-image slots actually present in the render
   * payload. Must match the order of `reference_image_urls` sent to the
   * generate-video function. Used to inject @ImageN tags so Seedance 2.0
   * binds each subject to the right ref. Multiple `brand`/`character`
   * entries are supported and matched by occurrence index.
   */
  imageRefs?: Array<"brand" | "brand-angle" | "character" | "location">;
  /** Free-text adaptation layer — preset stays the locked structure, this tweaks tone/details. */
  userNote?: string;
  /** Brand identity (palette, typography vibe, mood) applied to lighting/props/text. */
  brandIdentity?: BrandIdentityContext | null;
  /** Overlay controls (end-card, logo, headline/CTA/price). */
  overlay?: OverlayBrief;
};

export type OverlayBrief = {
  mode: "none" | "endcard" | "lower_third" | "corner" | "center";
  logo: boolean;
  headline?: string;
  cta?: string;
  price?: string;
};

const find = (list: StudioPreset[], id?: string) =>
  id ? list.find((p) => p.id === id) : undefined;

function refTagAt(
  refs: StudioBrief["imageRefs"],
  slot: "brand" | "brand-angle" | "character" | "location",
  occurrence = 0,
): string | null {
  if (!refs) return null;
  let seen = -1;
  for (let i = 0; i < refs.length; i++) {
    if (refs[i] === slot) {
      seen++;
      if (seen === occurrence) return `@Image${i + 1}`;
    }
  }
  return null;
}

function brandLineAt(
  b: BrandContext,
  refs: StudioBrief["imageRefs"],
  occurrence: number,
  role: "hero" | "supporting" | "only",
  angleOffset = 0,
  overlay?: OverlayBrief,
): string | null {
  if (!b || !b.name) return null;
  const tag = refTagAt(refs, "brand", occurrence);
  const labelPrefix =
    role === "hero" ? "Hero product" : role === "supporting" ? "Supporting product (share the frame, do not steal focus)" : "Product";
  const bits = [`${labelPrefix}: ${b.name}`];
  if (b.category) bits.push(`Category: ${b.category}`);
  if (b.description) bits.push(b.description);
  if (b.tagline) bits.push(`Tagline: "${b.tagline}"`);
  if (b.audience) bits.push(`Audience: ${b.audience}`);
  if (b.url) bits.push(`Ref: ${b.url}`);
  // Distinguish brand wordmark/logo from actual product photos.
  // The brand-image slot is the LOGO; only product-angle refs lock product shape.
  const angleLabels = b.angle_labels ?? [];
  const hasAngles = angleLabels.length > 0;
  const cleanMode = overlay && (overlay.mode === "none" || overlay.logo === false);
  if (tag) {
    if (cleanMode) {
      bits.push(
        hasAngles
          ? `Use ${tag} only as a color/style/typography reference for the brand. Do NOT render ${tag} as an end-card stamp, watermark, or on-screen graphic anywhere in the video. Product shape, parts and proportions come from the angle references below and the PRODUCT LOCK spec.`
          : `Use ${tag} only as a color/style/typography reference for the brand. Do NOT render ${tag} as an end-card stamp, watermark, or on-screen graphic anywhere in the video. Render the product itself faithfully from the PRODUCT LOCK spec below (shape, parts, materials, colors).`,
      );
    } else {
      bits.push(
        hasAngles
          ? `Use ${tag} as the brand wordmark/logo only — it MUST appear visibly as an END-CARD stamp over the final hero frame, and also on any packaging, screens, garment tags or labels when the scene includes them; do NOT use it as the product silhouette. Product shape, parts and proportions come from the angle references below and the PRODUCT LOCK spec.`
          : `Use ${tag} as the brand wordmark/logo only — it MUST appear visibly as an END-CARD stamp over the final hero frame, and on any packaging, screens or label moments in the scene; do NOT treat it as a photo of the product. Render the product itself faithfully from the PRODUCT LOCK spec below (shape, parts, materials, colors). Use ${tag} only for the visible logo, end-card or packaging mark.`,
      );
    }
  }

  // Additional angle references (front / back / packaging / …) — same product
  // from different viewpoints, so the model can lock 3D shape across shots.
  const angleTags: string[] = [];
  for (let k = 0; k < angleLabels.length; k++) {
    const t = refTagAt(refs, "brand-angle", angleOffset + k);
    if (t) angleTags.push(`${t} = ${angleLabels[k] || `angle ${k + 1}`}`);
  }
  if (angleTags.length > 0) {
    bits.push(
      `Product photo references (alternate viewpoints of the SAME product, NOT different products): ${angleTags.join("; ")}. Treat shape, label text, colors and proportions as the union of all these refs — pick the angle that best fits each shot. These — not the logo — are the source of truth for product appearance.`,
    );
  }

  // PRODUCT LOCK — what every frame must visibly show. This is the single
  // most important block for keeping the render anchored to the real product.
  const lock: string[] = [];
  if (b.visual_parts) lock.push(`visible parts: ${b.visual_parts}`);
  if (b.materials) lock.push(`materials/finish: ${b.materials}`);
  if (b.packaging) lock.push(`packaging: ${b.packaging}`);
  if (b.hero_colors && b.hero_colors.length > 0) {
    lock.push(`hero colors: ${b.hero_colors.join(", ")}`);
  }
  const line = bits.join(" — ");
  if (lock.length === 0) return line;
  return `${line}\nPRODUCT LOCK (${b.name}) — ${lock.join("; ")}. Show these exact details in every frame, especially the hero beat. Do not invent other parts, ingredients or colors.`;
}

function locationLine(l?: LocationContext, refs?: StudioBrief["imageRefs"]): string | null {
  if (!l || (!l.place && !l.hasImage)) return null;
  const tag = refTagAt(refs, "location", 0);
  const parts: string[] = [];
  if (l.place) parts.push(`Location: ${l.place} — match the city's architecture, light and cultural styling`);
  if (l.hasImage) {
    parts.push(
      tag
        ? `Use ${tag} as the location reference — match its architecture, light and styling`
        : "A reference photo of the real location is provided — match its look",
    );
  }
  return parts.join(". ");
}

function characterLineAt(c: CharacterContext, refs: StudioBrief["imageRefs"], occurrence: number, role: "lead" | "supporting" | "only"): string | null {
  if (!c || !c.name) return null;
  const tag = refTagAt(refs, "character", occurrence);
  const labelPrefix = role === "lead" ? "Lead on-camera" : role === "supporting" ? "Also on-camera (shares the frame, lead leads the action)" : "On-camera";
  const bits = [`${labelPrefix}: ${c.name}`];
  if (c.role) bits.push(`Role: ${c.role}`);
  if (c.description) bits.push(c.description);
  const shot = c.shot_type ?? "face";
  if (c.hasImage) {
    if (shot === "full") {
      bits.push(
        tag
          ? `Use ${tag} as the full-look reference — match face, build, wardrobe, footwear and accessories EXACTLY, and keep them identical across every shot`
          : "A full-look reference photo is provided — match face, build, wardrobe and accessories exactly, identical across every shot",
      );
    } else {
      const wardrobe = c.description?.trim()
        ? `wardrobe per description above`
        : `wardrobe natural and consistent across every shot`;
      bits.push(
        tag
          ? `Use ${tag} as the face reference — match face, hair and skin tone consistently across every frame; ${wardrobe}`
          : `A face reference photo is provided — match face, hair and skin tone consistently; ${wardrobe}`,
      );
    }
  }
  return bits.join(" — ");
}


export function brandIdentityLine(b?: BrandIdentityContext | null): string | null {
  if (!b) return null;
  const bits: string[] = [];
  if (b.primary_color) bits.push(`primary ${b.primary_color}`);
  if (b.supporting_colors && b.supporting_colors.length > 0) {
    bits.push(`supporting ${b.supporting_colors.join(" / ")}`);
  }
  if (b.avoid_colors && b.avoid_colors.length > 0) {
    bits.push(`AVOID: ${b.avoid_colors.join(", ")}`);
  }
  if (b.typography_vibe) {
    const label = b.typography_vibe.replace(/-/g, " ");
    bits.push(`typography vibe: ${label}${b.font_hint ? ` (${b.font_hint})` : ""}`);
  } else if (b.font_hint) {
    bits.push(`font hint: ${b.font_hint}`);
  }
  if (b.lighting_style) bits.push(`lighting: ${b.lighting_style.replace(/-/g, " ")}`);
  if (b.finish_vibe) bits.push(`finish/feel: ${b.finish_vibe.replace(/-/g, " ")}`);
  if (b.pacing) bits.push(`pacing: ${b.pacing.replace(/-/g, " ")}`);
  if (b.logo_treatment) bits.push(`logo treatment: ${b.logo_treatment.replace(/-/g, " ")}`);
  if (b.industry) bits.push(`industry: ${b.industry}`);
  if (b.brand_voice) bits.push(`voice: ${b.brand_voice}`);
  if (b.mood_notes) bits.push(`mood: ${b.mood_notes}`);
  if (b.tagline) bits.push(`tagline: "${b.tagline}"`);
  if (bits.length === 0) return null;
  const base = `BRAND LOCK — ${bits.join("; ")}. Apply the palette, lighting, finish and pacing across every shot. Never use the AVOID colors. Do NOT recolor the real product itself — the Product Lock above always wins on the product's own appearance.`;
  if (overlayOff) return base;
  return `${base} Match the typography vibe for any on-screen text. Honor the logo treatment instruction.`;
}

export function overlayLine(overlay?: OverlayBrief): string | null {
  if (!overlay) return null;
  if (overlay.mode === "none" || overlay.logo === false && !overlay.headline && !overlay.cta && !overlay.price) {
    if (overlay.mode === "none") {
      return `OVERLAY LOCK — CLEAN RENDER. Do NOT add any end-card, wordmark, logo, on-screen text, captions, price tags, or graphic overlays at any point in the video. The product appears unbranded: no visible logos on packaging, labels, screens or garments either. Final beat is a clean product hero shot with zero graphics.`;
    }
  }
  const placement =
    overlay.mode === "endcard"
      ? "a clean full-frame END-CARD at the final beat (held ~1s then fade)"
      : overlay.mode === "lower_third"
      ? "a lower-third overlay pinned to the bottom of the hero frame"
      : overlay.mode === "corner"
      ? "a small corner overlay (lower-right) on the hero frame"
      : "a centered overlay over the hero frame";
  const items: string[] = [];
  if (overlay.logo) items.push("the brand wordmark/logo");
  if (overlay.headline) items.push(`headline "${overlay.headline}"`);
  if (overlay.cta) items.push(`CTA "${overlay.cta}"`);
  const layout = items.length > 0
    ? `Render ${items.join(", ")} as ${placement}, in the brand's typography vibe and palette.`
    : `Render ${placement} in the brand's typography vibe and palette.`;
  const priceLine = overlay.price
    ? ` Additionally, overlay a small price/offer badge "${overlay.price}" on the product beat (corner badge, brand colors).`
    : "";
  return `OVERLAY LOCK — ${layout}${priceLine} Keep all on-screen text legible, kerned, and free of typos.`;
}

export function composeStudioPrompt(brief: StudioBrief): string {
  const format = find(FORMATS, brief.formatId);
  const setting = find(SETTINGS, brief.settingId);
  const subjectLine =
    brief.subject === "app"
      ? "Subject: a mobile app — feature its UI prominently on a phone screen held by the presenter."
      : "Subject: a physical product — feature it cleanly in-hand or on a hero surface.";

  const overlay = brief.overlay;
  const overlayOff = !!overlay && (overlay.mode === "none" || overlay.logo === false);

  const brands = brief.brands && brief.brands.length > 0
    ? brief.brands
    : brief.brand ? [brief.brand] : [];
  const characters = brief.characters && brief.characters.length > 0
    ? brief.characters
    : brief.character ? [brief.character] : [];

  let angleOffsetCursor = 0;
  const brandLines = brands.map((b, i) => {
    const myOffset = angleOffsetCursor;
    angleOffsetCursor += (b.angle_labels?.length ?? 0);
    return brandLineAt(
      b,
      brief.imageRefs,
      i,
      brands.length === 1 ? "only" : i === 0 ? "hero" : "supporting",
      myOffset,
      overlay,
    );
  });
  const characterLines = characters.map((c, i) =>
    characterLineAt(
      c,
      brief.imageRefs,
      i,
      characters.length === 1 ? "only" : i === 0 ? "lead" : "supporting",
    ),
  );

  const cleanOverride = overlay?.mode === "none"
    ? "OVERRIDE: Ignore any end-card, wordmark, logo, or on-screen text beat described in the format/setting fragments above. Replace any such beat with a clean hero shot of the product — no graphics, no captions, no logos, no packaging branding."
    : null;

  const closingLine = overlay?.mode === "none"
    ? "End on a confident product hero frame. No text, no logos, no graphics on screen at any point."
    : "End on a confident product hero frame. Keep text-on-screen minimal and legible.";

  const parts = [
    "Cinematic 9:16 social ad, 5 seconds, native audio.",
    subjectLine,
    ...brandLines,
    brandIdentityLine(brief.brandIdentity, overlayOff),
    ...characterLines,
    format?.fragment ?? (brief.customFormat?.trim() ? `Format: ${brief.customFormat.trim()}` : null),
    setting?.fragment ?? (brief.customSetting?.trim() ? `Setting: ${brief.customSetting.trim()}` : null),
    locationLine(brief.location, brief.imageRefs),
    brief.master.trim() ? `Story: ${brief.master.trim()}` : null,
    brief.userNote?.trim()
      ? `Additional direction (adapt tone and details on top of the locked preset, do not override structure): ${brief.userNote.trim()}`
      : null,
    overlayLine(overlay),
    cleanOverride,
    closingLine,
  ].filter(Boolean);


  return parts.join("\n");
}


