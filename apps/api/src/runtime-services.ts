import { authEnvironmentFromEnv, createMovPromptAuth } from "@movprompt/auth";
import { createDatabase, createGenerationService } from "@movprompt/db";
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
import { createDrizzleCreatorRepository } from "./creator-repository.js";
import { createSourceScanner } from "./source-scanner.js";

export type RuntimeServices = Pick<
  CreateApiOptions,
  | "authGateway"
  | "assetRepository"
  | "assetStorage"
  | "generationService"
  | "creatorRepository"
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

  if ((assetsEnabled || generationEnabled) && !authenticationEnabled) {
    throw new Error("FEATURE_ASSETS and FEATURE_GENERATION require FEATURE_AUTHENTICATION=true");
  }

  if (!authenticationEnabled) {
    return {
      readinessDependencies: [],
      async close() {},
    };
  }

  const database = createDatabase({
    url: databaseUrl(environment),
    ssl: environment.DATABASE_SSL === "require" ? "require" : false,
    applicationName: `${config.serviceName}-${config.environment}`,
  });
  const auth = createMovPromptAuth({
    db: database.db,
    environment: authEnvironmentFromEnv(environment),
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

  const generationService = generationEnabled
    ? createGenerationApiService({
        repository: createDrizzleGenerationRepository(database.db),
        generation: createGenerationService(database.db),
        pricing: createGenerationPricingFromEnvironment(environment),
        capabilities: createCapabilityRegistryFromEnvironment(environment),
      })
    : undefined;
  const creatorRepository = createDrizzleCreatorRepository(database.db);
  const sourceScanner = createSourceScanner();

  if (!assetsEnabled) {
    return {
      authGateway: createBetterAuthGateway(auth),
      creatorRepository,
      sourceScanner,
      ...(generationService ? { generationService } : {}),
      readinessDependencies,
      close: () => database.close(),
    };
  }

  const storage = new PrivateObjectStorage(objectStorageConfigFromEnv(environment));
  return {
    authGateway: createBetterAuthGateway(auth),
    creatorRepository,
    sourceScanner,
    assetRepository: createDrizzleAssetRepository(database.db),
    assetStorage: createAssetStorageGateway(storage),
    ...(generationService ? { generationService } : {}),
    readinessDependencies,
    close: () => database.close(),
  };
}
