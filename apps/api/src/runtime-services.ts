import { authEnvironmentFromEnv, createMovPromptAuth } from "@movprompt/auth";
import {
  createDatabase,
  createGenerationService,
  createServiceHeartbeatRepository,
} from "@movprompt/db";
import { createCapabilityRegistryFromEnvironment } from "@movprompt/providers";
import { objectStorageConfigFromEnv, PrivateObjectStorage } from "@movprompt/storage";
import { sql } from "drizzle-orm";
import type { CreateApiOptions, ReadinessDependency } from "./app.js";
import { createDrizzleAssetRepository } from "./asset-repository.js";
import { createAssetStorageGateway } from "./asset-storage.js";
import { createBetterAuthGateway } from "./auth-gateway.js";
import type { ApiConfig } from "./config.js";
import { createSmtpAuthEmailSender, smtpEmailConfigFromEnv } from "./email.js";
import { createGenerationPricingFromEnvironment } from "./generation-pricing.js";
import { createDrizzleGenerationRepository } from "./generation-repository.js";
import { createGenerationApiService } from "./generation-service.js";
import { createGenerationAvailabilityService } from "./generation-availability.js";
import { createDrizzleCreatorRepository } from "./creator-repository.js";
import { createGuestClaimRepository } from "./guest-claim-repository.js";
import { createGuestClaimService } from "./guest-claim-service.js";
import { createRemoteImageFetcher } from "./remote-image-fetcher.js";
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
  | "readinessDependencies"
> & {
  close(): Promise<void>;
};

function databaseUrl(environment: Readonly<Record<string, string | undefined>>): string {
  const value =
    environment.DATABASE_URL_POOLED?.trim() || environment.DATABASE_URL_DIRECT?.trim();
  if (!value) {
    throw new Error(
      "DATABASE_URL_POOLED or DATABASE_URL_DIRECT is required when authentication is enabled",
    );
  }
  return value;
}

export function createRuntimeServices(
  config: ApiConfig,
  environment: NodeJS.ProcessEnv = process.env,
): RuntimeServices {
  const authenticationEnabled = config.featureFlags.authentication;
  const assetsEnabled = config.featureFlags.assets;
  const generationEnabled = config.featureFlags.generation;
  const sourceScanner = createSourceScanner();
  const remoteImageFetcher = createRemoteImageFetcher();

  if ((assetsEnabled || generationEnabled) && !authenticationEnabled) {
    throw new Error("FEATURE_ASSETS and FEATURE_GENERATION require FEATURE_AUTHENTICATION=true");
  }
  if (generationEnabled && !assetsEnabled) {
    throw new Error("FEATURE_GENERATION requires FEATURE_ASSETS=true");
  }

  if (!authenticationEnabled) {
    return {
      sourceScanner,
      readinessDependencies: [],
      async close() {},
    };
  }

  const database = createDatabase({
    url: databaseUrl(environment),
    ssl: environment.DATABASE_SSL === "require" ? "require" : false,
    applicationName: `${config.serviceName}-${config.environment}`,
  });
  const authEnvironment = authEnvironmentFromEnv(environment);
  const auth = createMovPromptAuth({
    db: database.db,
    environment: authEnvironment,
    sendEmail: createSmtpAuthEmailSender(smtpEmailConfigFromEnv(environment)),
  });
  const readinessDependencies: ReadinessDependency[] = [
    {
      name: "postgres",
      check: async () => {
        await database.db.execute(sql`select 1`);
      },
    },
  ];

  const capabilities = createCapabilityRegistryFromEnvironment(environment);
  const pricing = createGenerationPricingFromEnvironment(environment);
  const generationService = assetsEnabled
    ? createGenerationApiService({
        repository: createDrizzleGenerationRepository(database.db),
        generation: createGenerationService(database.db),
        pricing,
        capabilities,
        starterOnly: environment.GENERATION_STARTER_ONLY?.trim().toLowerCase() !== "false",
        starterEligibilityRequiresEmailVerification:
          authEnvironment.firstCampaignVerificationPolicy !== "deferred_until_after_first_campaign",
      })
    : undefined;
  const creatorRepository = createDrizzleCreatorRepository(database.db);
  const guestClaimService = createGuestClaimService({
    repository: createGuestClaimRepository({ db: database.db }),
  });
  if (!assetsEnabled) {
    return {
      authGateway: createBetterAuthGateway(auth, authEnvironment.publicCapability),
      creatorRepository,
      guestClaimService,
      sourceScanner,
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
    heartbeats: createServiceHeartbeatRepository(database.db),
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
    assetRepository: createDrizzleAssetRepository(database.db),
    assetStorage,
    remoteImageFetcher,
    ...(generationService ? { generationService } : {}),
    generationAvailability,
    capabilityRegistry: capabilities,
    readinessDependencies,
    close: () => database.close(),
  };
}
