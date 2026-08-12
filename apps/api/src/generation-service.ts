import {
  CapabilityAliasSchema,
  GenerationConfigurationSchema,
  type CapabilityAlias,
  type CreateGenerationQuoteRequest,
  type GenerationConfiguration,
  type PublicRenderRun,
} from "@movprompt/contracts";
import {
  GenerationDomainError,
  hashGenerationConfiguration,
  type GenerationService,
  type JsonObject,
} from "@movprompt/db";
import {
  CapabilityResolutionError,
  type CapabilityRegistry,
} from "@movprompt/providers";

import type { AuthenticatedSession } from "./auth-gateway.js";
import type {
  GenerationRepository,
  OwnedProjectVersion,
  OwnedRenderRun,
  PublishedTemplateVersion,
} from "./generation-repository.js";
import {
  GenerationPricingUnavailableError,
  InvalidGenerationConfigurationError,
  type GenerationPricing,
} from "./generation-pricing.js";

export type PublicGenerationQuote = {
  quoteId: string | null;
  capability: CapabilityAlias;
  credits: number;
  entitlementEligible: boolean;
  configurationHash: string;
  pricingVersion: string;
  expiresAt: string;
  breakdown: Array<{ label: string; credits: number }>;
  estimateOnly: boolean;
};

export class GenerationApplicationError extends Error {
  constructor(
    readonly code:
      | "authentication_required"
      | "generation_service_unavailable"
      | "capability_unavailable"
      | "unapproved_capability"
      | "invalid_generation_configuration"
      | "project_version_not_found"
      | "template_version_not_found"
      | "quote_not_found"
      | "quote_expired"
      | "quote_configuration_mismatch"
      | "quote_price_changed"
      | "starter_entitlement_unavailable"
      | "insufficient_credits"
      | "idempotency_conflict"
      | "render_not_found"
      | "render_not_cancellable"
      | "provider_acceptance_in_progress",
    message: string = code,
  ) {
    super(message);
    this.name = "GenerationApplicationError";
  }
}

export interface GenerationApiService {
  isAvailable(): boolean;
  createQuote(
    request: CreateGenerationQuoteRequest,
    session: AuthenticatedSession | null,
  ): Promise<PublicGenerationQuote>;
  startRender(input: {
    userId: string;
    projectId: string;
    projectVersionId: string;
    quoteId: string;
    idempotencyKey: string;
  }): Promise<PublicRenderRun>;
  getRender(userId: string, runId: string): Promise<PublicRenderRun>;
  cancelRender(userId: string, runId: string, idempotencyKey: string): Promise<PublicRenderRun>;
}

type GenerationApiServiceOptions = {
  repository: GenerationRepository;
  generation: Pick<GenerationService, "createQuote" | "startRender" | "releaseRenderReservation">;
  pricing: GenerationPricing;
  capabilities: CapabilityRegistry;
  now?: () => Date;
};

function generationConfiguration(configuration: JsonObject): GenerationConfiguration {
  const nested = configuration.generation;
  const candidate =
    typeof nested === "object" && nested !== null && !Array.isArray(nested)
      ? nested
      : configuration;
  const parsed = GenerationConfigurationSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new GenerationApplicationError(
      "invalid_generation_configuration",
      "The saved project version does not contain a valid generation configuration.",
    );
  }
  return parsed.data;
}

function boundConfiguration(input: {
  capability: CapabilityAlias;
  pricingVersion: string;
  templateVersionId: string | null;
  configuration: GenerationConfiguration;
}): JsonObject {
  return {
    capability: input.capability,
    pricingVersion: input.pricingVersion,
    templateVersionId: input.templateVersionId,
    generation: input.configuration,
  } as JsonObject;
}

function publicRun(run: OwnedRenderRun): PublicRenderRun {
  const capability = CapabilityAliasSchema.safeParse(run.capabilityAlias);
  if (!capability.success) {
    throw new GenerationApplicationError(
      "generation_service_unavailable",
      "A render contains an unsupported capability alias.",
    );
  }
  return {
    id: run.id,
    projectId: run.projectId,
    projectVersionId: run.projectVersionId,
    capability: capability.data,
    quoteId: run.quoteId,
    quotedCredits: run.quotedCredits,
    chargedCredits: run.chargedCredits,
    starterEntitlementUsed: run.starterEntitlementUsed,
    status: run.status,
    outputAvailable: Boolean(run.outputBucket && run.outputObjectKey),
    error: run.errorCode
      ? {
          code: run.errorCode,
          ...(run.errorMessage ? { message: run.errorMessage } : {}),
        }
      : null,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
  };
}

function mapCapabilityError(error: unknown): never {
  if (error instanceof CapabilityResolutionError) {
    if (error.code === "unapproved_capability") {
      throw new GenerationApplicationError("unapproved_capability", "The capability is not approved.");
    }
    throw new GenerationApplicationError(
      "capability_unavailable",
      "The approved capability is not configured in this environment.",
    );
  }
  throw error;
}

function mapDomainError(error: unknown): never {
  if (error instanceof GenerationDomainError) {
    const directCodes = new Set([
      "quote_not_found",
      "quote_expired",
      "quote_configuration_mismatch",
      "starter_entitlement_unavailable",
      "insufficient_credits",
      "idempotency_conflict",
      "render_not_found",
    ]);
    if (directCodes.has(error.code)) {
      throw new GenerationApplicationError(
        error.code as
          | "quote_not_found"
          | "quote_expired"
          | "quote_configuration_mismatch"
          | "starter_entitlement_unavailable"
          | "insufficient_credits"
          | "idempotency_conflict"
          | "render_not_found",
        error.message,
      );
    }
    if (error.code === "project_version_not_found") {
      throw new GenerationApplicationError("project_version_not_found");
    }
    if (error.code === "render_not_releasable") {
      throw new GenerationApplicationError("provider_acceptance_in_progress");
    }
  }
  throw error;
}

async function publishedTemplate(
  repository: GenerationRepository,
  templateVersionId: string | null | undefined,
): Promise<PublishedTemplateVersion | null> {
  if (!templateVersionId) return null;
  const template = await repository.findPublishedTemplateVersion(templateVersionId);
  if (!template) throw new GenerationApplicationError("template_version_not_found");
  return template;
}

async function eligibleForStarter(input: {
  repository: GenerationRepository;
  session: AuthenticatedSession | null;
  template: PublishedTemplateVersion | null;
}): Promise<boolean> {
  return Boolean(
    input.session?.user.emailVerified &&
      input.template?.starterRenderEligible &&
      (await input.repository.hasAvailableStarterEntitlement(input.session.user.id)),
  );
}

export function createGenerationApiService(options: GenerationApiServiceOptions): GenerationApiService {
  const now = options.now ?? (() => new Date());

  function assertCapability(capability: CapabilityAlias): void {
    try {
      options.capabilities.resolve(capability);
    } catch (error) {
      mapCapabilityError(error);
    }
    if (!options.pricing.isAvailable(capability)) {
      throw new GenerationApplicationError(
        "generation_service_unavailable",
        "Authoritative pricing is not configured for this capability.",
      );
    }
  }

  async function loadOwnedVersion(userId: string, projectVersionId: string): Promise<OwnedProjectVersion> {
    const version = await options.repository.findOwnedProjectVersion(userId, projectVersionId);
    if (!version) throw new GenerationApplicationError("project_version_not_found");
    return version;
  }

  async function getOwnedRender(userId: string, runId: string): Promise<OwnedRenderRun> {
    const run = await options.repository.findOwnedRun(userId, runId);
    if (!run) throw new GenerationApplicationError("render_not_found");
    return run;
  }

  return {
    isAvailable() {
      return options.capabilities
        .listPublic()
        .some((capability) => capability.available && options.pricing.isAvailable(capability.alias));
    },

    async createQuote(request, session) {
      assertCapability(request.capability);
      const pricingVersion = options.pricing.version;
      const quotedAt = now();
      const expiresAt = new Date(quotedAt.getTime() + options.pricing.quoteTtlSeconds * 1_000);

      if (request.projectVersionId) {
        if (!session) throw new GenerationApplicationError("authentication_required");
        const version = await loadOwnedVersion(session.user.id, request.projectVersionId);
        const configuration = generationConfiguration(version.configuration);
        const template = await publishedTemplate(options.repository, version.templateVersionId);
        const price = options.pricing.price(
          request.capability,
          configuration,
          template?.durationSeconds,
        );
        const entitlementEligible = await eligibleForStarter({
          repository: options.repository,
          session,
          template,
        });
        const binding = boundConfiguration({
          capability: request.capability,
          pricingVersion,
          templateVersionId: version.templateVersionId,
          configuration,
        });
        try {
          const quote = await options.generation.createQuote({
            userId: session.user.id,
            ...(version.templateVersionId ? { templateVersionId: version.templateVersionId } : {}),
            capabilityAlias: request.capability,
            credits: price.credits,
            entitlementEligible,
            breakdown: price.breakdown,
            configuration: binding,
            expiresAt,
            now: quotedAt,
          });
          return {
            quoteId: quote.id,
            capability: request.capability,
            credits: quote.credits,
            entitlementEligible: quote.entitlementEligible,
            configurationHash: quote.configurationHash,
            pricingVersion,
            expiresAt: quote.expiresAt.toISOString(),
            breakdown: quote.breakdown,
            estimateOnly: false,
          };
        } catch (error) {
          mapDomainError(error);
        }
      }

      const configuration = request.configuration!;
      const template = await publishedTemplate(options.repository, request.templateVersionId);
      const price = options.pricing.price(
        request.capability,
        configuration,
        template?.durationSeconds,
      );
      const entitlementEligible = await eligibleForStarter({
        repository: options.repository,
        session,
        template,
      });
      const binding = boundConfiguration({
        capability: request.capability,
        pricingVersion,
        templateVersionId: request.templateVersionId ?? null,
        configuration,
      });
      return {
        quoteId: null,
        capability: request.capability,
        credits: price.credits,
        entitlementEligible,
        configurationHash: hashGenerationConfiguration(binding),
        pricingVersion,
        expiresAt: expiresAt.toISOString(),
        breakdown: price.breakdown,
        estimateOnly: true,
      };
    },

    async startRender(input) {
      const version = await loadOwnedVersion(input.userId, input.projectVersionId);
      if (version.projectId !== input.projectId) {
        throw new GenerationApplicationError("project_version_not_found");
      }
      const quote = await options.repository.findOwnedQuote(input.userId, input.quoteId);
      if (!quote) throw new GenerationApplicationError("quote_not_found");
      const capability = CapabilityAliasSchema.safeParse(quote.capabilityAlias);
      if (!capability.success) throw new GenerationApplicationError("unapproved_capability");
      assertCapability(capability.data);
      const template = await publishedTemplate(options.repository, version.templateVersionId);
      const configuration = generationConfiguration(version.configuration);
      const binding = boundConfiguration({
        capability: capability.data,
        pricingVersion: options.pricing.version,
        templateVersionId: version.templateVersionId,
        configuration,
      });
      if (quote.templateVersionId !== version.templateVersionId) {
        throw new GenerationApplicationError("quote_configuration_mismatch");
      }
      if (quote.configurationHash !== hashGenerationConfiguration(binding)) {
        throw new GenerationApplicationError("quote_configuration_mismatch");
      }
      const currentPrice = options.pricing.price(
        capability.data,
        configuration,
        template?.durationSeconds,
      );
      if (quote.credits !== currentPrice.credits) {
        throw new GenerationApplicationError("quote_price_changed");
      }
      try {
        const run = await options.generation.startRender({
          userId: input.userId,
          projectId: input.projectId,
          projectVersionId: input.projectVersionId,
          quoteId: input.quoteId,
          idempotencyKey: input.idempotencyKey,
          capabilityAlias: capability.data,
          configuration: binding,
          now: now(),
        });
        return publicRun({
          ...run,
          providerRequestId: run.providerRequestId,
        });
      } catch (error) {
        mapDomainError(error);
      }
    },

    async getRender(userId, runId) {
      return publicRun(await getOwnedRender(userId, runId));
    },

    async cancelRender(userId, runId, _idempotencyKey) {
      const run = await getOwnedRender(userId, runId);
      if (run.status === "cancelled" || run.status === "cancelling") return publicRun(run);
      if (run.status === "completed" || run.status === "failed") {
        throw new GenerationApplicationError("render_not_cancellable");
      }
      if (run.status === "submitting") {
        if (run.providerRequestId || run.chargedAt) {
          throw new GenerationApplicationError(
            "provider_acceptance_in_progress",
            "Provider acceptance is in progress. Refresh the run before trying cancellation again.",
          );
        }
        try {
          await options.generation.releaseRenderReservation({
            userId,
            runId,
            reason: "user_cancelled_before_provider_acceptance",
            terminalStatus: "cancelled",
            now: now(),
          });
          return publicRun(await getOwnedRender(userId, runId));
        } catch (error) {
          mapDomainError(error);
        }
      }

      const cancelling = await options.repository.requestProviderCancellation(userId, runId, now());
      if (cancelling) return publicRun(cancelling);
      const latest = await getOwnedRender(userId, runId);
      if (latest.status === "cancelling" || latest.status === "cancelled") return publicRun(latest);
      throw new GenerationApplicationError(
        "render_not_cancellable",
        "The render cannot be cancelled in its current state.",
      );
    },
  };
}

export function generationDependencyUnavailable(error: unknown): boolean {
  return (
    error instanceof GenerationPricingUnavailableError ||
    error instanceof InvalidGenerationConfigurationError
  );
}
