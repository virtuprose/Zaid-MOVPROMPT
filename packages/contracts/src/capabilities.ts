import { z } from "zod";

export const CapabilityAliasSchema = z.enum([
  "video.cinematic",
  "video.product_fidelity",
  "image.product",
  "presenter.ai_ugc",
  "avatar.enroll",
  "avatar.perform",
  "voice.clone",
  "speech.generate",
  "speech.lip_sync",
  "media.transcribe",
  "media.moderate",
]);

export type CapabilityAlias = z.infer<typeof CapabilityAliasSchema>;

export const CapabilityKindSchema = z.enum([
  "video",
  "image",
  "presenter",
  "avatar",
  "voice",
  "speech",
  "media",
]);

export type CapabilityKind = z.infer<typeof CapabilityKindSchema>;

/**
 * Public capability information. Provider names and provider model IDs are
 * deliberately absent and must never cross the API boundary.
 */
export const PublicCapabilitySchema = z
  .object({
    alias: CapabilityAliasSchema,
    kind: CapabilityKindSchema,
    available: z.boolean(),
  })
  .strict();

export type PublicCapability = z.infer<typeof PublicCapabilitySchema>;
