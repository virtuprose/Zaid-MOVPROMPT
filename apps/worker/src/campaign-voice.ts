import {
  CreativeBriefSchema,
  compileKuwaitiCampaignCopy,
  templateRequiresSynchronizedSpeech,
} from "@movprompt/creative-engine";
import type { JsonObject } from "@movprompt/db";

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export interface CampaignVoiceRenderer {
  render(configuration: JsonObject): Promise<Uint8Array | undefined>;
}

export type AzureCampaignVoiceOptions = {
  apiKey: string;
  region: string;
  kuwaitiVoice?: "ar-KW-NouraNeural" | "ar-KW-FahedNeural";
  englishVoice?: string;
  fetcher?: Fetcher;
};

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function generationConfiguration(configuration: JsonObject): JsonObject {
  const generation = configuration.generation;
  return generation && typeof generation === "object" && !Array.isArray(generation)
    ? generation as JsonObject
    : configuration;
}

function englishScript(brief: ReturnType<typeof CreativeBriefSchema.parse>): string {
  return brief.scenes.map((scene) => scene.voiceover.en.trim()).filter(Boolean).join(" ");
}

type VoiceSegment = { locale: "ar-KW" | "en-US"; voice: string; text: string };

function voiceSegments(
  brief: ReturnType<typeof CreativeBriefSchema.parse>,
  kuwaitiVoice: string,
  englishVoice: string,
): VoiceSegment[] {
  if (brief.language === "en") {
    return [{ locale: "en-US", voice: englishVoice, text: englishScript(brief) }];
  }
  const kuwaiti = compileKuwaitiCampaignCopy(brief);
  if (brief.language === "ar") {
    return [{ locale: "ar-KW", voice: kuwaitiVoice, text: kuwaiti.fullVoiceover }];
  }
  // A bilingual video uses one language per scene rather than reading every
  // line twice, preserving the template duration and natural campaign rhythm.
  return brief.scenes.map((scene, index) => index % 2 === 0
    ? { locale: "ar-KW" as const, voice: kuwaitiVoice, text: kuwaiti.scenes[index]!.voiceover }
    : { locale: "en-US" as const, voice: englishVoice, text: scene.voiceover.en.trim() },
  ).filter((segment) => segment.text);
}

export function createAzureCampaignVoiceRenderer(options: AzureCampaignVoiceOptions): CampaignVoiceRenderer {
  const apiKey = options.apiKey.trim();
  const region = options.region.trim().toLowerCase();
  const kuwaitiVoice = options.kuwaitiVoice ?? "ar-KW-NouraNeural";
  const englishVoice = options.englishVoice?.trim() || "en-US-AvaMultilingualNeural";
  if (!apiKey) throw new Error("azure_speech_api_key_required");
  if (!/^[a-z0-9-]+$/u.test(region)) throw new Error("azure_speech_region_invalid");
  if (!/^ar-KW-(Noura|Fahed)Neural$/u.test(kuwaitiVoice)) throw new Error("kuwaiti_voice_required");
  if (!/^[a-z]{2,3}-[A-Z]{2}-[A-Za-z0-9]+Neural$/u.test(englishVoice)) {
    throw new Error("english_voice_invalid");
  }
  const fetcher = options.fetcher ?? fetch;

  return {
    async render(configuration) {
      const generation = generationConfiguration(configuration);
      if (generation.audio === false) return undefined;
      const parsed = CreativeBriefSchema.safeParse(generation.creativeBrief);
      if (!parsed.success) return undefined;
      const brief = parsed.data;
      // Speaking-presenter templates retain the provider's synchronized native
      // dialogue. Replacing it with detached TTS would create visible lip drift;
      // dialect and synchronization must instead pass the output quality gate.
      if (templateRequiresSynchronizedSpeech(brief.templateId)) return undefined;
      const segments = voiceSegments(brief, kuwaitiVoice, englishVoice);
      if (!segments.length || segments.every((segment) => !segment.text.trim())) return undefined;
      const locale = brief.language === "en" ? "en-US" : "ar-KW";
      const body = segments.map((segment, index) =>
        `<voice name="${segment.voice}"><lang xml:lang="${segment.locale}"><prosody rate="0%" pitch="0%">${escapeXml(segment.text)}</prosody></lang></voice>${index < segments.length - 1 ? '<break time="220ms"/>' : ""}`,
      ).join("");
      const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}">${body}</speak>`;
      const response = await fetcher(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: "POST",
        headers: {
          "ocp-apim-subscription-key": apiKey,
          "content-type": "application/ssml+xml",
          "x-microsoft-outputformat": "audio-48khz-192kbitrate-mono-mp3",
          "user-agent": "MovPrompt-Campaign-Engine",
        },
        body: ssml,
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) throw new Error(`azure_speech_http_${response.status}`);
      const audio = new Uint8Array(await response.arrayBuffer());
      if (!audio.byteLength) throw new Error("azure_speech_empty_audio");
      return audio;
    },
  };
}
