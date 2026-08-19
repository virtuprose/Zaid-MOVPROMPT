import {
  GuestClaimReceiptSchema,
  type GuestClaimReceipt,
  type GuestClaimSnapshot,
} from "@movprompt/contracts";

import {
  GuestClaimRepositoryError,
  type GuestClaimRepository,
} from "./guest-claim-repository.js";

export class GuestClaimServiceError extends Error {
  constructor(
    readonly code: "conflict" | "assets_pending",
    readonly retryable: boolean,
  ) {
    super(code);
    this.name = "GuestClaimServiceError";
  }
}

export interface GuestClaimService {
  claimGuestDraft(input: { userId: string; snapshot: GuestClaimSnapshot }): Promise<GuestClaimReceipt>;
}

export function createGuestClaimService(dependencies: {
  repository: GuestClaimRepository;
}): GuestClaimService {
  return {
    async claimGuestDraft({ userId, snapshot }) {
      if (snapshot.assetManifest.length > 0) {
        throw new GuestClaimServiceError("assets_pending", true);
      }

      try {
        const project = await dependencies.repository.claimAssetFree({ userId, snapshot });
        const version = project.currentVersion;
        if (!version) throw new Error("guest_claim_version_missing");

        return GuestClaimReceiptSchema.parse({
          status: "ready",
          draftId: snapshot.draftId,
          pendingGenerationId: snapshot.pendingGenerationId,
          snapshotDigest: snapshot.snapshotDigest,
          project,
          version,
        });
      } catch (error) {
        if (error instanceof GuestClaimRepositoryError) {
          throw new GuestClaimServiceError("conflict", false);
        }
        throw error;
      }
    },
  };
}
