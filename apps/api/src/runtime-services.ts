import { authEnvironmentFromEnv, createMovPromptAuth } from "@movprompt/auth";
import {
  createMongoDatabase,
  createMongoGenerationService,
  createMongoServiceHeartbeatRepository,
  ensureMongoIndexes,
  mongoConfigFromEnv,
} from "@movprompt/db";
import { createCapabilityRegistryFromEnvironment } from "@movprompt/providers";
import { objectStorageConfigFromEnv, PrivateObjectStorage } from "@movprompt/storage";
import type { CreateApiOptions, ReadinessDependency } from "./app.js";
import { createMongoAssetRepository } from "./mongo-asset-repository.js";
import { createAssetStorageGateway } from "./asset-storage.js";
import { createBetterAuthGateway } from "./auth-gateway.js";
import type { ApiConfig } from "./config.js";
import { createSmtpAuthEmailSender, smtpEmailConfigFromEnv } from "./email.js";
import { createGenerationPricingFromEnvironment } from "./generation-pricing.js";
import { createMongoGenerationRepository } from "./mongo-generation-repository.js";
import { createCampaignEligibilityService } from "./campaign-eligibility.js";
import { createGenerationApiService } from "./generation-service.js";
import { createGenerationAvailabilityService } from "./generation-availability.js";
import { createMongoCreatorRepository } from "./mongo-creator-repository.js";
import { createMongoGuestClaimRepository } from "./mongo-guest-claim-repository.js";
import { createGuestClaimService } from "./guest-claim-service.js";
import { createRemoteImageFetcher } from "./remote-image-fetcher.js";
import { createMongoRequestRateLimiter } from "./request-rate-limiter.js";
import { createSourceScanner } from "./source-scanner.js";

export type RuntimeServices = Pick<
  CreateApiOptions,
  | "authGateway"
  | "assetRepository"
  | "assetStorage"
  | "remoteImageFetcher"
  | "generationService"
  | "generationAvailability"
  | "capabilityRegistry"
  | "creatorRepository"
  | "guestClaimService"
  | "sourceScanner"
  | "requestRateLimiter"
  | "readinessDependencies"
> & {
  close(): Promise<void>;
};

export function createRuntimeServices(
  config: ApiConfig,
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeServices {
  const authenticationEnabled = config.featureFlags.authentication;
  const assetsEnabled = config.featureFlags.assets;
  const generationEnabled = config.featureFlags.generation;

  if ((assetsEnabled || generationEnabled) && !authenticationEnabled) {
    throw new Error("FEATURE_ASSETS and FEATURE_GENERATION require FEATURE_AUTHENTICATION=true");
  }
  if (generationEnabled && !assetsEnabled) {
    throw new Error("FEATURE_GENERATION requires FEATURE_ASSETS=true");
  }

  const database = createMongoDatabase({
    ...mongoConfigFromEnv(environment),
    applicationName: `${config.serviceName}-${config.environment}`,
  });
  const requestRateLimiter = createMongoRequestRateLimiter({
    database,
    ...config.requestRateLimit,
  });
  const sourceScanner = createSourceScanner();
  const remoteImageFetcher = createRemoteImageFetcher();
  const readinessDependencies: ReadinessDependency[] = [
    { name: "mongodb", check: async () => { await database.connect(); await ensureMongoIndexes(database); } },
  ];

  if (!authenticationEnabled) {
    return { sourceScanner, requestRateLimiter, readinessDependencies, close: () => database.close() };
  }
  const authEnvironment = authEnvironmentFromEnv(environment);
  const auth = createMovPromptAuth({
    db: database,
    environment: authEnvironment,
    sendEmail: createSmtpAuthEmailSender(smtpEmailConfigFromEnv(environment)),
  });

  const capabilities = createCapabilityRegistryFromEnvironment(environment);
  const pricing = createGenerationPricingFromEnvironment(environment);
  const generationRepository = createMongoGenerationRepository(database);
  const campaignEligibility = createCampaignEligibilityService();
  const generationService = assetsEnabled
    ? createGenerationApiService({
        repository: generationRepository,
        generation: createMongoGenerationService(database),
        pricing,
        capabilities,
        starterOnly: environment.GENERATION_STARTER_ONLY?.trim().toLowerCase() !== "false",
        starterEligibilityRequiresEmailVerification:
          authEnvironment.firstCampaignVerificationPolicy !== "deferred_until_after_first_campaign",
      })
    : undefined;
  const creatorRepository = createMongoCreatorRepository(database);
  const guestClaimService = createGuestClaimService({
    repository: createMongoGuestClaimRepository(database),
    campaignEligibility,
  });
  if (!assetsEnabled) {
    return {
      authGateway: createBetterAuthGateway(auth, authEnvironment.publicCapability),
      creatorRepository,
      guestClaimService,
      sourceScanner,
      requestRateLimiter,
      ...(generationService ? { generationService } : {}),
      capabilityRegistry: capabilities,
      readinessDependencies,
      close: () => database.close(),
    };
  }

  const storage = new PrivateObjectStorage(objectStorageConfigFromEnv(environment));
  const assetStorage = createAssetStorageGateway(storage);
  const generationAvailability = createGenerationAvailabilityService({
    enabled: generationEnabled,
    environment,
    capabilities,
    pricing,
    storage: assetStorage,
    heartbeats: createMongoServiceHeartbeatRepository(database),
  });
  if (generationEnabled) {
    readinessDependencies.push({
      name: "generation-runtime",
      check: async () => {
        const availability = await generationAvailability.evaluate();
        if (availability.status !== "ready") throw new Error(availability.reason ?? "unavailable");
      },
    });
  }
  return {
    authGateway: createBetterAuthGateway(auth, authEnvironment.publicCapability),
    creatorRepository,
    guestClaimService,
    sourceScanner,
    requestRateLimiter,
    assetRepository: createMongoAssetRepository(database),
    assetStorage,
    remoteImageFetcher,
    ...(generationService ? { generationService } : {}),
    generationAvailability,
    capabilityRegistry: capabilities,
    readinessDependencies,
    close: () => database.close(),
  };
}
