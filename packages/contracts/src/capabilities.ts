import { z } from "zod";

export const CapabilityAliasSchema = z.enum([
  "video.seedance.latest",
  "video.omni_flash.latest",
  "image.nano_banana.latest",
]);

export type CapabilityAlias = z.infer<typeof CapabilityAliasSchema>;

export const CapabilityKindSchema = z.enum(["video", "image"]);

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
