import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import {
  createDatabase,
  createDatabaseAbandonedClaimCleanupRepository,
  createServiceHeartbeatRepository,
  MOVPROMPT_WORKER_SERVICE_NAME,
} from "@movprompt/db";
import {
  createBytePlusSeedanceAdapter,
  createCapabilityRegistryFromEnvironment,
  createVercelGatewaySeedanceAdapter,
  ProviderAdapterRegistry,
  generationRuntimeFingerprint,
} from "@movprompt/providers";
import { objectStorageConfigFromEnv, PrivateObjectStorage } from "@movprompt/storage";
import { loadWorkerConfig } from "./config.js";
import { createAzureCampaignVoiceRenderer } from "./campaign-voice.js";
import { createHealthJobHandler } from "./handlers.js";
import { AbandonedClaimCleanupService } from "./abandoned-claim-cleanup.js";
import { jsonWorkerLogger } from "./logger.js";
import { createFfprobeTechnicalAnalyzer, createGatewayVideoQualityAnalyzer } from "./media-quality-analyzers.js";
import { createPostgresOutboxRepository, OutboxDispatcher } from "./outbox-dispatcher.js";
import { createComposedOutputQualityReviewer } from "./output-quality-reviewer.js";
import { validateCalibrationArtifact, type CalibrationEligibility } from "./benchmark-manifest.js";
import { PgBossWorker } from "./pg-boss-worker.js";
import {
  createDatabaseAssetReferenceVerifier,
  createGatewayFirstFramePreparer,
  createVerifiedReferenceUrlResolver,
} from "./reference-frame-preparer.js";
import { createProviderOutputPersister } from "./output-persister.js";
import {
  createDatabaseGenerationBilling,
  createDatabaseRenderLifecycleStore,
  createGenerationLifecycleHandler,
} from "./render-lifecycle.js";
import { WorkerHeartbeat } from "./service-heartbeat.js";

const execFileAsync = promisify(execFile);

const config = loadWorkerConfig();
const database = createDatabase({
  url: config.databaseUrl,
  applicationName: `${config.serviceName}-outbox`,
  ssl: process.env.DATABASE_SSL === "require" ? "require" : false,
});
const capabilityRegistry = createCapabilityRegistryFromEnvironment(process.env);
// Concrete provider packages register their adapters at this server-only
// composition boundary. An empty registry deliberately fails closed.
const adapterRegistry = new ProviderAdapterRegistry();
const providerOutputHosts = (process.env.PROVIDER_OUTPUT_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);
const bytePlusApiKey = process.env.BYTEPLUS_ARK_API_KEY?.trim();
const workerStorage = providerOutputHosts.length || bytePlusApiKey
  ? new PrivateObjectStorage(objectStorageConfigFromEnv(process.env))
  : undefined;
// Cleanup is independently useful before any paid-generation provider is enabled.
// When explicitly enabled, storage configuration remains fail-closed at startup.
const cleanupStorage = workerStorage ?? (process.env.MOVPROMPT_ABANDONED_CLAIM_CLEANUP_ENABLED?.trim().toLowerCase() === "true"
  ? new PrivateObjectStorage(objectStorageConfigFromEnv(process.env))
  : undefined);
const azureSpeechKey = process.env.AZURE_SPEECH_KEY?.trim();
const azureSpeechRegion = process.env.AZURE_SPEECH_REGION?.trim();
const campaignVoiceRenderer = azureSpeechKey && azureSpeechRegion
  ? createAzureCampaignVoiceRenderer({
      apiKey: azureSpeechKey,
      region: azureSpeechRegion,
      kuwaitiVoice: (process.env.AZURE_SPEECH_KUWAITI_VOICE?.trim() || "ar-KW-NouraNeural") as "ar-KW-NouraNeural" | "ar-KW-FahedNeural",
      ...(process.env.AZURE_SPEECH_ENGLISH_VOICE?.trim()
        ? { englishVoice: process.env.AZURE_SPEECH_ENGLISH_VOICE.trim() }
        : {}),
    })
  : undefined;
const outputPersister = providerOutputHosts.length
  ? createProviderOutputPersister({
      storage: workerStorage!,
      allowedHosts: providerOutputHosts,
      ...(campaignVoiceRenderer ? { voiceRenderer: campaignVoiceRenderer } : {}),
    })
  : undefined;
const gatewayApiKey = process.env.AI_GATEWAY_API_KEY?.trim();
const gatewayQualityModel = process.env.MOVPROMPT_QUALITY_MODEL_ID?.trim();
const gatewayQualityRubricVersion = process.env.MOVPROMPT_QUALITY_RUBRIC_VERSION?.trim();

/**
 * Calibration evidence is intentionally opt-in through explicit server paths.
 * A missing, malformed, stale, or non-approved artifact is a runtime quality
 * outage, never permission to use the model's score as customer acceptance.
 */
function loadQualityCalibration(): CalibrationEligibility | undefined {
  const candidatePath = process.env.MOVPROMPT_QUALITY_CANDIDATE_MANIFEST_PATH?.trim();
  const calibrationPath = process.env.MOVPROMPT_QUALITY_CALIBRATION_PATH?.trim();
  if (!candidatePath || !calibrationPath || !gatewayQualityModel || !gatewayQualityRubricVersion) return undefined;
  try {
    return validateCalibrationArtifact({
      candidateManifest: JSON.parse(readFileSync(resolve(candidatePath), "utf8")),
      evidence: JSON.parse(readFileSync(resolve(calibrationPath), "utf8")),
      activeEvaluatorVersion: gatewayQualityModel,
      activeRubricVersion: gatewayQualityRubricVersion,
    });
  } catch (error) {
    jsonWorkerLogger.warn("quality_calibration_unavailable", {
      code: error instanceof Error ? error.message.split(":", 1)[0] : "calibration_validation_failed",
    });
    return undefined;
  }
}

const qualityCalibration = loadQualityCalibration();
const gatewayReferenceVerifier = workerStorage
  ? createDatabaseAssetReferenceVerifier(database.db, workerStorage.assetsBucket)
  : undefined;
const verifiedReferenceUrlResolver = workerStorage && gatewayReferenceVerifier
  ? createVerifiedReferenceUrlResolver({
      storage: workerStorage,
      verifyReference: gatewayReferenceVerifier,
    })
  : undefined;
const gatewayFirstFramePreparer = workerStorage && gatewayReferenceVerifier && process.env.FFMPEG_PATH?.trim()
  ? createGatewayFirstFramePreparer({
      storage: workerStorage,
      verifyReference: gatewayReferenceVerifier,
      ffmpegPath: process.env.FFMPEG_PATH.trim(),
    })
  : undefined;
const outputQualityReviewer = workerStorage && gatewayApiKey && gatewayQualityModel
  ? createComposedOutputQualityReviewer([
      createFfprobeTechnicalAnalyzer({ storage: workerStorage }),
      createGatewayVideoQualityAnalyzer({
        storage: workerStorage,
        apiKey: gatewayApiKey,
        modelId: gatewayQualityModel,
        ...(process.env.VERCEL_AI_GATEWAY_BASE_URL?.trim()
          ? { gatewayBaseUrl: process.env.VERCEL_AI_GATEWAY_BASE_URL.trim() }
          : {}),
      }),
    ], qualityCalibration)
  : undefined;

function registerBytePlusCapability(
  alias: "video.cinematic" | "video.product_fidelity",
  environmentPrefix: "VIDEO_CINEMATIC" | "VIDEO_PRODUCT_FIDELITY",
): void {
  const prefix = `MOVPROMPT_CAPABILITY_${environmentPrefix}`;
  if (
    process.env[`${prefix}_ENABLED`]?.trim().toLowerCase() !== "true" ||
    process.env.MOVPROMPT_PROVIDER_BYTEPLUS_READY?.trim().toLowerCase() !== "true" ||
    process.env[`${prefix}_ADAPTER_ID`]?.trim() !== "byteplus-modelark" ||
    !process.env[`${prefix}_MODEL_ID`]?.trim() ||
    !bytePlusApiKey ||
    !workerStorage ||
    !verifiedReferenceUrlResolver ||
    !providerOutputHosts.length ||
    !outputQualityReviewer ||
    !campaignVoiceRenderer
  ) {
    return;
  }
  const requestedResolution = process.env.BYTEPLUS_SEEDANCE_RESOLUTION?.trim();
  const resolution = requestedResolution === "720p" ? "720p" : "1080p";
  adapterRegistry.register(createBytePlusSeedanceAdapter({
    capability: alias,
    apiKey: bytePlusApiKey,
    modelId: process.env[`${prefix}_MODEL_ID`]!,
    resolution,
    generateAudio: process.env.BYTEPLUS_SEEDANCE_GENERATE_AUDIO?.trim().toLowerCase() === "true",
    ...(process.env.BYTEPLUS_ARK_BASE_URL?.trim()
      ? { baseUrl: process.env.BYTEPLUS_ARK_BASE_URL.trim() }
      : {}),
    ...(process.env.BYTEPLUS_CALLBACK_URL?.trim()
      ? { callbackUrl: process.env.BYTEPLUS_CALLBACK_URL.trim() }
      : {}),
    resolveReferenceUrl: verifiedReferenceUrlResolver,
  }));
}

registerBytePlusCapability("video.cinematic", "VIDEO_CINEMATIC");
registerBytePlusCapability("video.product_fidelity", "VIDEO_PRODUCT_FIDELITY");

function registerVercelGatewayCapability(
  alias: "video.cinematic" | "video.product_fidelity",
  environmentPrefix: "VIDEO_CINEMATIC" | "VIDEO_PRODUCT_FIDELITY",
): void {
  const prefix = `MOVPROMPT_CAPABILITY_${environmentPrefix}`;
  if (
    process.env[`${prefix}_ENABLED`]?.trim().toLowerCase() !== "true" ||
    process.env.MOVPROMPT_PROVIDER_VERCEL_GATEWAY_READY?.trim().toLowerCase() !== "true" ||
    process.env[`${prefix}_ADAPTER_ID`]?.trim() !== "vercel-ai-gateway" ||
    !process.env[`${prefix}_MODEL_ID`]?.trim() ||
    !gatewayApiKey ||
    !workerStorage ||
    !providerOutputHosts.length ||
    !gatewayFirstFramePreparer ||
    !verifiedReferenceUrlResolver ||
    !outputQualityReviewer
  ) {
    return;
  }
  const requestedResolution = process.env.VERCEL_GATEWAY_SEEDANCE_RESOLUTION_TIER?.trim() || "720p";
  if (requestedResolution !== "480p" && requestedResolution !== "720p") {
    throw new Error("vercel_gateway_seedance_resolution_tier_invalid");
  }
  adapterRegistry.register(createVercelGatewaySeedanceAdapter({
    capability: alias,
    apiKey: gatewayApiKey,
    modelId: process.env[`${prefix}_MODEL_ID`]!,
    applicationEnvironment: config.environment,
    resolutionTier: requestedResolution,
    generateAudio: process.env.VERCEL_GATEWAY_SEEDANCE_GENERATE_AUDIO?.trim().toLowerCase() === "true",
    ...(process.env.VERCEL_AI_GATEWAY_BASE_URL?.trim()
      ? { baseUrl: process.env.VERCEL_AI_GATEWAY_BASE_URL.trim() }
      : {}),
    resolveReferenceUrl: verifiedReferenceUrlResolver,
    resolveFirstFrame: gatewayFirstFramePreparer,
  }));
}

registerVercelGatewayCapability("video.cinematic", "VIDEO_CINEMATIC");
registerVercelGatewayCapability("video.product_fidelity", "VIDEO_PRODUCT_FIDELITY");

async function assertGenerationRuntimeReady(): Promise<boolean> {
  if (process.env.FEATURE_GENERATION?.trim().toLowerCase() !== "true") return false;
  if (!workerStorage || !outputPersister || !outputQualityReviewer || !providerOutputHosts.length) {
    throw new Error("generation_worker_dependencies_unavailable");
  }
  await Promise.all([
    workerStorage.checkBucket(workerStorage.assetsBucket),
    workerStorage.checkBucket(workerStorage.outputsBucket),
  ]);
  await Promise.all([
    execFileAsync(process.env.FFMPEG_PATH?.trim() || "ffmpeg", ["-version"], { timeout: 10_000 }),
    execFileAsync(process.env.FFPROBE_PATH?.trim() || "ffprobe", ["-version"], { timeout: 10_000 }),
  ]);
  for (const alias of ["video.cinematic", "video.product_fidelity"] as const) {
    const capability = capabilityRegistry.resolve(alias);
    adapterRegistry.get(capability.adapterId, capability.alias);
  }
  return Boolean(qualityCalibration);
}

let resolveWorker: (worker: PgBossWorker) => void = () => undefined;
const workerReady = new Promise<PgBossWorker>((resolve) => {
  resolveWorker = resolve;
});
const generationHandler = createGenerationLifecycleHandler({
  store: createDatabaseRenderLifecycleStore(database.db),
  billing: createDatabaseGenerationBilling(database.db),
  capabilityRegistry,
  adapterRegistry,
  ...(outputPersister ? { outputPersister } : {}),
  ...(outputQualityReviewer ? { outputQualityReviewer } : {}),
  reconciliationDelaySeconds: config.renderReconciliationDelaySeconds,
  scheduleReconciliation: async (payload, delaySeconds) => {
    const worker = await workerReady;
    await worker.enqueueGeneration(payload, {
      singletonKey: `reconcile:${payload.renderRunId}`,
      singletonNextSlot: true,
      delaySeconds,
    });
  },
});

const worker = new PgBossWorker({
  config,
  logger: jsonWorkerLogger,
  handlers: {
    health: createHealthJobHandler(),
    generation: generationHandler,
  },
  ...(cleanupStorage
    ? {
        abandonedClaimCleanup: new AbandonedClaimCleanupService({
          repository: createDatabaseAbandonedClaimCleanupRepository(database.db),
          storage: { remove: (bucket, objectKey) => cleanupStorage.delete(bucket, objectKey) },
        }),
      }
    : {}),
});
resolveWorker(worker);

const dispatcher = new OutboxDispatcher({
  repository: createPostgresOutboxRepository(database.db),
  queue: worker,
  workerId: config.workerId,
  logger: jsonWorkerLogger,
  batchSize: config.outboxBatchSize,
  leaseMs: config.outboxLeaseMs,
  pollIntervalMs: config.outboxPollIntervalMs,
});

const generationReady = await assertGenerationRuntimeReady();
const heartbeat = new WorkerHeartbeat({
  repository: createServiceHeartbeatRepository(database.db),
  serviceName: MOVPROMPT_WORKER_SERVICE_NAME,
  instanceId: config.workerId,
  intervalSeconds: config.heartbeatIntervalSeconds,
  metadata: {
    version: config.version,
    environment: config.environment,
    generationReady,
    configurationFingerprint: generationRuntimeFingerprint(process.env),
  },
  logger: jsonWorkerLogger,
});
try {
  await worker.start();
  dispatcher.start();
  await heartbeat.start();

  if (config.smokeTestOnStart) {
    const jobId = await worker.enqueueHealthCheck(randomUUID());
    jsonWorkerLogger.info("worker_health_job_enqueued", { jobId, workerId: config.workerId });
  }
} catch (error) {
  jsonWorkerLogger.error("worker_start_failed", {
    workerId: config.workerId,
    error: error instanceof Error ? error.message : String(error),
  });
  await heartbeat.stop().catch(() => undefined);
  await dispatcher.stop().catch(() => undefined);
  await worker.stop().catch(() => undefined);
  await database.close().catch(() => undefined);
  throw error;
}

let stopping = false;
async function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  jsonWorkerLogger.info("worker_stopping", { signal, workerId: config.workerId });
  try {
    await heartbeat.stop();
    await dispatcher.stop();
    await worker.stop();
    await database.close();
  } catch (error) {
    jsonWorkerLogger.error("worker_stop_failed", {
      workerId: config.workerId,
      error: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
