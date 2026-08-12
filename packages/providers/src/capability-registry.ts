import {
  CapabilityAliasSchema,
  type CapabilityAlias,
  type CapabilityKind,
  type PublicCapability,
} from "@movprompt/contracts";

type ServerCapabilitySpec = {
  alias: CapabilityAlias;
  kind: CapabilityKind;
  environmentPrefix: string;
};

const SERVER_CAPABILITY_SPECS: Readonly<Record<CapabilityAlias, ServerCapabilitySpec>> =
  Object.freeze({
    "video.cinematic": {
      alias: "video.cinematic",
      kind: "video",
      environmentPrefix: "VIDEO_CINEMATIC",
    },
    "video.product_fidelity": {
      alias: "video.product_fidelity",
      kind: "video",
      environmentPrefix: "VIDEO_PRODUCT_FIDELITY",
    },
    "image.product": {
      alias: "image.product",
      kind: "image",
      environmentPrefix: "IMAGE_PRODUCT",
    },
    "presenter.ai_ugc": {
      alias: "presenter.ai_ugc",
      kind: "presenter",
      environmentPrefix: "PRESENTER_AI_UGC",
    },
    "avatar.enroll": {
      alias: "avatar.enroll",
      kind: "avatar",
      environmentPrefix: "AVATAR_ENROLL",
    },
    "avatar.perform": {
      alias: "avatar.perform",
      kind: "avatar",
      environmentPrefix: "AVATAR_PERFORM",
    },
    "voice.clone": {
      alias: "voice.clone",
      kind: "voice",
      environmentPrefix: "VOICE_CLONE",
    },
    "speech.generate": {
      alias: "speech.generate",
      kind: "speech",
      environmentPrefix: "SPEECH_GENERATE",
    },
    "speech.lip_sync": {
      alias: "speech.lip_sync",
      kind: "speech",
      environmentPrefix: "SPEECH_LIP_SYNC",
    },
    "media.transcribe": {
      alias: "media.transcribe",
      kind: "media",
      environmentPrefix: "MEDIA_TRANSCRIBE",
    },
    "media.moderate": {
      alias: "media.moderate",
      kind: "media",
      environmentPrefix: "MEDIA_MODERATE",
    },
  });

export type ServerCapabilityConfiguration = {
  enabled: boolean;
  adapterId?: string;
  providerModelId?: string;
};

export type ResolvedCapability = {
  alias: CapabilityAlias;
  kind: CapabilityKind;
  adapterId: string;
  providerModelId: string;
};

export type CapabilityResolutionErrorCode =
  | "unapproved_capability"
  | "capability_kind_mismatch"
  | "capability_unavailable";

export class CapabilityResolutionError extends Error {
  readonly code: CapabilityResolutionErrorCode;

  constructor(code: CapabilityResolutionErrorCode) {
    super(code);
    this.name = "CapabilityResolutionError";
    this.code = code;
  }
}

/**
 * Resolves public aliases to server-only provider configuration. Only the
 * approved semantic aliases can be represented in this registry.
 */
export class CapabilityRegistry {
  readonly #configuration: Readonly<Partial<Record<CapabilityAlias, ServerCapabilityConfiguration>>>;

  constructor(configuration: Partial<Record<CapabilityAlias, ServerCapabilityConfiguration>> = {}) {
    this.#configuration = Object.freeze({ ...configuration });
  }

  listPublic(): PublicCapability[] {
    return Object.values(SERVER_CAPABILITY_SPECS).map((spec) => ({
      alias: spec.alias,
      kind: spec.kind,
      available: this.#isAvailable(spec.alias),
    }));
  }

  resolve(value: string, expectedKind?: CapabilityKind): ResolvedCapability {
    const parsedAlias = CapabilityAliasSchema.safeParse(value);
    if (!parsedAlias.success) {
      throw new CapabilityResolutionError("unapproved_capability");
    }

    const spec = SERVER_CAPABILITY_SPECS[parsedAlias.data];
    if (!spec) {
      throw new CapabilityResolutionError("unapproved_capability");
    }
    if (expectedKind && spec.kind !== expectedKind) {
      throw new CapabilityResolutionError("capability_kind_mismatch");
    }

    const configuration = this.#configuration[parsedAlias.data];
    if (
      !configuration?.enabled ||
      !configuration.adapterId?.trim() ||
      !configuration.providerModelId?.trim()
    ) {
      throw new CapabilityResolutionError("capability_unavailable");
    }

    return {
      alias: spec.alias,
      kind: spec.kind,
      adapterId: configuration.adapterId,
      providerModelId: configuration.providerModelId,
    };
  }

  #isAvailable(alias: CapabilityAlias): boolean {
    const configuration = this.#configuration[alias];
    return Boolean(
      configuration?.enabled &&
        configuration.adapterId?.trim() &&
        configuration.providerModelId?.trim(),
    );
  }
}

function isEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

/**
 * Capabilities are fail-closed: they are unavailable unless all three
 * server-only environment values are explicitly present.
 */
export function createCapabilityRegistryFromEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
): CapabilityRegistry {
  const configuration: Partial<Record<CapabilityAlias, ServerCapabilityConfiguration>> = {};

  for (const spec of Object.values(SERVER_CAPABILITY_SPECS)) {
    const prefix = `MOVPROMPT_CAPABILITY_${spec.environmentPrefix}`;
    const adapterId = environment[`${prefix}_ADAPTER_ID`];
    const providerModelId = environment[`${prefix}_MODEL_ID`];
    configuration[spec.alias] = {
      enabled: isEnabled(environment[`${prefix}_ENABLED`]),
      ...(adapterId === undefined ? {} : { adapterId }),
      ...(providerModelId === undefined ? {} : { providerModelId }),
    };
  }

  return new CapabilityRegistry(configuration);
}
