import type { GuestClaimAssetManifest, GuestClaimReceipt } from "@movprompt/contracts";

import {
  deleteVerifiedGuestDraft,
  loadGuestDraft,
  markGuestDraftCleanupEligible,
  type GuestClaimCheckpoint,
  type StoredGuestDraft,
} from "./guestDraftStore";
import type { CreationDraft } from "./contracts";

export type GuestClaimRecoveryState =
  | { state: "missing" | "expired" }
  | { state: "recoverable"; draft: StoredGuestDraft }
  | { state: "verified"; draft: StoredGuestDraft }
  | { state: "receipt_mismatch" | "configuration_mismatch" | "asset_mismatch" | "wrong_account"; draft: StoredGuestDraft };

export type CanonicalClaimReceipt = GuestClaimReceipt & {
  /** The authenticated claim boundary must return the server-confirmed manifest, never inferred from URLs. */
  assetManifest?: GuestClaimAssetManifest;
};

export type GuestClaimFailureReason = "claim_failed" | "offline" | "checksum_mismatch" | "configuration_mismatch" | "wrong_account";

export function recoverFailedGuestClaim(draft: CreationDraft, reason: GuestClaimFailureReason): { state: GuestClaimFailureReason; draft: CreationDraft } {
  return { state: reason, draft };
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`).join(",")}}`;
}

function sameManifest(expected: GuestClaimAssetManifest, actual: GuestClaimAssetManifest | undefined) {
  return Boolean(actual) && canonical(expected) === canonical(actual);
}

export async function loadGuestClaimRecovery(draftId: string): Promise<GuestClaimRecoveryState> {
  const loaded = await loadGuestDraft(draftId);
  if (!("draft" in loaded)) return loaded;
  return { state: "recoverable", draft: loaded.draft };
}

/** A receipt without exact configuration and ordered server digests cannot clear browser data. */
export function verifyCanonicalReceipt(draft: StoredGuestDraft, receipt: CanonicalClaimReceipt): GuestClaimRecoveryState {
  const checkpoint: GuestClaimCheckpoint | undefined = draft.claimCheckpoint;
  if (!checkpoint || receipt.status !== "ready" || receipt.draftId !== draft.id || receipt.pendingGenerationId !== draft.pendingGenerationId || receipt.snapshotDigest !== checkpoint.snapshotDigest) {
    return { state: "receipt_mismatch", draft };
  }
  if (canonical(checkpoint.configuration) !== canonical(receipt.version.configuration)) {
    return { state: "configuration_mismatch", draft };
  }
  if (!sameManifest(checkpoint.assetManifest, receipt.assetManifest)) {
    return { state: "asset_mismatch", draft };
  }
  return { state: "verified", draft };
}

export async function verifyAndDeleteVerifiedDraft(draftId: string, receipt: CanonicalClaimReceipt): Promise<GuestClaimRecoveryState> {
  const recovery = await loadGuestClaimRecovery(draftId);
  if (recovery.state !== "recoverable") return recovery;
  const verified = verifyCanonicalReceipt(recovery.draft, receipt);
  if (verified.state !== "verified") return verified;
  if (!await markGuestDraftCleanupEligible(draftId, receipt.pendingGenerationId)) return { state: "receipt_mismatch", draft: recovery.draft };
  await deleteVerifiedGuestDraft(draftId, receipt.pendingGenerationId);
  return verified;
}
