import type { GuestClaimSnapshot } from "@movprompt/contracts";
import type { CreatorProjectRecord } from "@movprompt/contracts";

import {
  CreatorRepositoryError,
  type CreatorRepository,
} from "./creator-repository.js";

export class GuestClaimRepositoryError extends Error {
  constructor(readonly code: "conflict") {
    super(code);
    this.name = "GuestClaimRepositoryError";
  }
}

export interface GuestClaimRepository {
  claimAssetFree(input: { userId: string; snapshot: GuestClaimSnapshot }): Promise<CreatorProjectRecord>;
}

/**
 * The tracer deliberately delegates project/version creation to the existing
 * owner-scoped transaction. Task 02-01-03 replaces this adapter with the
 * durable claim-operation repository after the migration exists.
 */
export function createGuestClaimRepository(dependencies: {
  creatorRepository: CreatorRepository;
}): GuestClaimRepository {
  return {
    async claimAssetFree({ userId, snapshot }) {
      try {
        return await dependencies.creatorRepository.claimDraft(userId, {
          draftId: snapshot.draftId,
          title: snapshot.title,
          mode: snapshot.mode,
          ...(snapshot.templateVersionId ? { templateVersionId: snapshot.templateVersionId } : {}),
          configuration: {
            ...snapshot.configuration,
            _guestClaim: {
              pendingGenerationId: snapshot.pendingGenerationId,
              snapshotDigest: snapshot.snapshotDigest,
              assetManifest: snapshot.assetManifest,
            },
          },
          productRecipe: snapshot.productRecipe,
          campaignRecipe: snapshot.campaignRecipe,
        });
      } catch (error) {
        if (error instanceof CreatorRepositoryError && error.code === "idempotency_conflict") {
          throw new GuestClaimRepositoryError("conflict");
        }
        throw error;
      }
    },
  };
}
