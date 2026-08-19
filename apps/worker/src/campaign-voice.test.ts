import { describe, expect, it, vi } from "vitest";

import { createAzureCampaignVoiceRenderer } from "./campaign-voice.js";
import { CREATIVE_TEMPLATE_CATALOG, ENGINE_VERSION } from "@movprompt/creative-engine";

describe("Azure campaign voice renderer", () => {
  it("uses an explicit ar-KW voice and the compiled Kuwaiti script", async () => {
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      expect(init?.headers).toMatchObject({
        "x-microsoft-outputformat": "audio-48khz-192kbitrate-mono-mp3",
      });
      expect(String(init?.body)).toContain('xml:lang="ar-KW"');
      expect(String(init?.body)).toContain('name="ar-KW-NouraNeural"');
      expect(String(init?.body)).toMatch(/الحين|وايد|راسلنا|حياكم/u);
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    });
    const template = CREATIVE_TEMPLATE_CATALOG.find((item) => item.id === "whatsapp-sales-ad")!;
    const renderer = createAzureCampaignVoiceRenderer({
      apiKey: "secret",
      region: "uaenorth",
      fetcher,
    });
    await expect(renderer.render({
      generation: {
        creativeBrief: {
          engineVersion: ENGINE_VERSION,
          templateId: template.id,
          market: "KW",
          language: "ar",
          arabicDialect: "kuwaiti",
          dialectRegister: template.dialectRegister,
          tone: template.tone,
          vertical: template.verticals[0],
          goal: template.goals[0],
          product: { name: "عطر نور", callToAction: "WhatsApp" },
          scenes: template.scenes,
          qualityPolicy: template.qualityPolicy,
        },
      },
    })).resolves.toEqual(new Uint8Array([1, 2, 3]));
  });

  it("rejects a non-Kuwait Arabic voice", () => {
    expect(() => createAzureCampaignVoiceRenderer({
      apiKey: "secret",
      region: "uaenorth",
      kuwaitiVoice: "ar-SA-ZariyahNeural" as "ar-KW-NouraNeural",
    })).toThrow("kuwaiti_voice_required");
  });

  it("alternates Kuwait Arabic and English voices without doubling every bilingual scene", async () => {
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      const ssml = String(init?.body);
      expect(ssml).toContain('name="ar-KW-FahedNeural"');
      expect(ssml).toContain('xml:lang="ar-KW"');
      expect(ssml).toContain('name="en-US-AvaMultilingualNeural"');
      expect(ssml).toContain('xml:lang="en-US"');
      expect(ssml.match(/<voice /gu)).toHaveLength(4);
      return new Response(new Uint8Array([4, 5, 6]), { status: 200 });
    });
    const template = CREATIVE_TEMPLATE_CATALOG.find((item) => item.scenes.length === 4)!;
    const renderer = createAzureCampaignVoiceRenderer({
      apiKey: "secret",
      region: "uaenorth",
      kuwaitiVoice: "ar-KW-FahedNeural",
      fetcher,
    });
    await renderer.render({
      creativeBrief: {
        engineVersion: ENGINE_VERSION,
        templateId: template.id,
        market: "KW",
        language: "bilingual",
        arabicDialect: "kuwaiti",
        dialectRegister: template.dialectRegister,
        tone: template.tone,
        vertical: template.verticals[0],
        goal: template.goals[0],
        product: { name: "عطر نور", callToAction: "WhatsApp" },
        scenes: template.scenes,
        qualityPolicy: template.qualityPolicy,
      },
    });
  });

  it("does not replace synchronized presenter dialogue with a detached TTS track", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const template = CREATIVE_TEMPLATE_CATALOG.find((item) => item.capabilityPolicy.includes("speech.lip_sync"))!;
    const renderer = createAzureCampaignVoiceRenderer({ apiKey: "secret", region: "uaenorth", fetcher });
    await expect(renderer.render({
      creativeBrief: {
        engineVersion: ENGINE_VERSION,
        templateId: template.id,
        market: "KW",
        language: "ar",
        arabicDialect: "kuwaiti",
        dialectRegister: template.dialectRegister,
        tone: template.tone,
        vertical: template.verticals[0],
        goal: template.goals[0],
        product: { name: "عطر نور", callToAction: "WhatsApp" },
        scenes: template.scenes,
        qualityPolicy: template.qualityPolicy,
      },
    })).resolves.toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("does not add a deterministic voice track when the campaign audio toggle is off", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const template = CREATIVE_TEMPLATE_CATALOG.find((item) => !item.capabilityPolicy.includes("speech.lip_sync"))!;
    const renderer = createAzureCampaignVoiceRenderer({ apiKey: "secret", region: "uaenorth", fetcher });
    await expect(renderer.render({
      generation: {
        audio: false,
        creativeBrief: {
          engineVersion: ENGINE_VERSION,
          templateId: template.id,
          market: "KW",
          language: "ar",
          arabicDialect: "kuwaiti",
          dialectRegister: template.dialectRegister,
          tone: template.tone,
          vertical: template.verticals[0],
          goal: template.goals[0],
          product: { name: "عطر نور", callToAction: "WhatsApp" },
          scenes: template.scenes,
          qualityPolicy: template.qualityPolicy,
        },
      },
    })).resolves.toBeUndefined();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
