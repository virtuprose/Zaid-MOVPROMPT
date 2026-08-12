import { CapabilityAliasSchema, type CapabilityAlias } from "@movprompt/contracts";

export type ProviderOperationStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type ProviderReference = {
  objectKey: string;
  mimeType: string;
};

export type ProviderGenerationRequest = {
  operationId: string;
  capability: CapabilityAlias;
  prompt: string;
  durationSeconds?: number;
  aspectRatio?: "9:16" | "1:1" | "4:5" | "16:9";
  references: ProviderReference[];
  idempotencyKey: string;
};

export type ProviderSubmission = {
  providerRequestId: string;
  status: Extract<ProviderOperationStatus, "queued" | "processing">;
  acceptedAt: string;
};

export type ProviderOperation = {
  providerRequestId: string;
  status: ProviderOperationStatus;
  outputUrl?: string;
  errorCode?: string;
  errorMessage?: string;
};

export interface ProviderAdapter {
  readonly id: string;
  readonly capability: CapabilityAlias;
  submit(request: ProviderGenerationRequest): Promise<ProviderSubmission>;
  getStatus(providerRequestId: string): Promise<ProviderOperation>;
  cancel(providerRequestId: string): Promise<ProviderOperation>;
}

export class ProviderAdapterRegistry {
  readonly #adapters = new Map<string, ProviderAdapter>();

  register(adapter: ProviderAdapter): void {
    CapabilityAliasSchema.parse(adapter.capability);
    if (!adapter.id.trim()) throw new Error("provider_adapter_id_required");
    const key = this.#key(adapter.id, adapter.capability);
    if (this.#adapters.has(key)) {
      throw new Error(`provider_adapter_already_registered:${key}`);
    }
    this.#adapters.set(key, adapter);
  }

  get(adapterId: string, capability: CapabilityAlias): ProviderAdapter {
    const adapter = this.#adapters.get(this.#key(adapterId, capability));
    if (!adapter) {
      throw new Error("provider_adapter_unavailable");
    }
    return adapter;
  }

  #key(adapterId: string, capability: CapabilityAlias): string {
    return `${adapterId}:${capability}`;
  }
}
