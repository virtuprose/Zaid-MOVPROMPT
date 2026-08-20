import {
  CampaignSourceSchema,
  type CampaignSource,
} from "@movprompt/contracts";

/** Parse at every browser boundary so campaign facts cannot acquire display URLs or duplicate fields. */
export function normalizeCampaignSource(source: CampaignSource): CampaignSource {
  return CampaignSourceSchema.parse(source);
}
