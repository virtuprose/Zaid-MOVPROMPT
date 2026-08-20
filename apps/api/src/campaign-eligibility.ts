import {
  CampaignPresenterSchema,
  type CampaignPresenter,
  type GuestClaimSnapshot,
} from "@movprompt/contracts";
import type { CapabilityRegistry } from "@movprompt/providers";
import type { JsonObject } from "@movprompt/db";

import type { GenerationRepository, OwnedPresenterFootageAsset, PublishedTemplateVersion } from "./generation-repository.js";

const FOOTAGE_MIME_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

export class CampaignEligibilityError extends Error {
  constructor() {
    super("presenter_configuration_ineligible");
    this.name = "CampaignEligibilityError";
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function campaignValue(configuration: JsonObject, campaignRecipe?: JsonObject): unknown {
  const creatorProject = record(configuration.creatorProject);
  const generation = record(configuration.generation);
  const quoteContext = record(generation?.templateQuoteContext);
  return creatorProject?.presenter
    ?? quoteContext?.presenter
    ?? campaignRecipe?.presenter
    ?? creatorProject?.presenterMode
    ?? quoteContext?.presenterMode
    ?? campaignRecipe?.presenterMode
    ?? "none";
}

function presenter(configuration: JsonObject, campaignRecipe?: JsonObject): CampaignPresenter {
  const value = campaignValue(configuration, campaignRecipe);
  const candidate = typeof value === "string" ? { mode: value } : value;
  const parsed = CampaignPresenterSchema.safeParse(candidate);
  if (!parsed.success) throw new CampaignEligibilityError();
  return parsed.data;
}

function campaignLanguage(configuration: JsonObject, campaignRecipe?: JsonObject): string {
  const generation = record(configuration.generation);
  const quoteContext = record(generation?.templateQuoteContext);
  const creativeBrief = record(generation?.creativeBrief);
  const value = quoteContext?.language ?? creativeBrief?.language ?? campaignRecipe?.language;
  return typeof value === "string" ? value : "";
}

function validFootage(asset: OwnedPresenterFootageAsset | null | undefined): boolean {
  return Boolean(
    asset
      && FOOTAGE_MIME_TYPES.has(asset.mimeType.toLowerCase())
      && asset.sizeBytes > 0
      && asset.durationMs !== null
      && asset.durationMs > 0
      && asset.durationMs <= 10 * 60 * 1_000
      && asset.checksumSha256
      && /^[a-f0-9]{64}$/u.test(asset.checksumSha256),
  );
}

function templateAllows(template: PublishedTemplateVersion | null, mode: CampaignPresenter["mode"], language: string): boolean {
  return Boolean(
    template
      && template.presenterModes.includes(mode)
      && template.supportedLanguages.includes(language),
  );
}

export type CampaignEligibilityService = {
  assertGuestClaim(input: { snapshot: GuestClaimSnapshot }): Promise<void>;
  assertProjectPresenter(input: {
    configuration: JsonObject;
    campaignRecipe?: JsonObject;
    templateVersionId: string | null;
    footage?: OwnedPresenterFootageAsset | null;
  }): Promise<void>;
  presenterFromConfiguration(input: { configuration: JsonObject; campaignRecipe?: JsonObject }): CampaignPresenter;
};

export function createCampaignEligibilityService(dependencies: {
  templates: Pick<GenerationRepository, "findPublishedTemplateVersion">;
  capabilities: CapabilityRegistry;
}): CampaignEligibilityService {
  async function assertPresenter(input: {
    configuration: JsonObject;
    campaignRecipe?: JsonObject;
    templateVersionId: string | null;
    footage?: OwnedPresenterFootageAsset | null;
  }): Promise<void> {
    const selected = presenter(input.configuration, input.campaignRecipe);
    if (selected.mode === "none") return;
    const language = campaignLanguage(input.configuration, input.campaignRecipe);
    const template = input.templateVersionId
      ? await dependencies.templates.findPublishedTemplateVersion(input.templateVersionId)
      : null;
    if (!templateAllows(template, selected.mode, language)) throw new CampaignEligibilityError();
    if (selected.mode === "ai_ugc") {
      try {
        dependencies.capabilities.resolve("presenter.ai_ugc");
      } catch {
        throw new CampaignEligibilityError();
      }
      return;
    }
    if (!validFootage(input.footage)) throw new CampaignEligibilityError();
  }

  return {
    assertGuestClaim: async ({ snapshot }) => {
      const selected = presenter(snapshot.configuration, snapshot.campaignRecipe);
      if (selected.mode === "none") return;
      if (selected.mode !== "uploaded_spokesperson") {
        await assertPresenter({
          configuration: snapshot.configuration,
          campaignRecipe: snapshot.campaignRecipe,
          templateVersionId: snapshot.templateVersionId ?? null,
        });
        return;
      }
      const asset = snapshot.assetManifest.find((entry) => entry.localAssetId === selected.assetId);
      const footage = asset && asset.kind === "footage"
        ? {
            id: asset.localAssetId,
            mimeType: asset.mimeType,
            sizeBytes: asset.sizeBytes,
            checksumSha256: asset.checksumSha256,
            durationMs: asset.durationMs ?? null,
          }
        : null;
      await assertPresenter({
        configuration: snapshot.configuration,
        campaignRecipe: snapshot.campaignRecipe,
        templateVersionId: snapshot.templateVersionId ?? null,
        footage,
      });
    },
    assertProjectPresenter: assertPresenter,
    presenterFromConfiguration: ({ configuration, campaignRecipe }) => presenter(configuration, campaignRecipe),
  };
}
