import { afterEach, describe, expect, it } from "vitest";

import type { CreationDraft } from "./contracts";
import {
  createMemoryGuestDraftStorage,
  getGuestDraft,
  markClaimCheckpoint,
  getGuestAsset,
  putGuestAsset,
  saveGuestDraft,
  setGuestDraftStorageForTests,
} from "./guestDraftStore";
import {
  recoverFailedGuestClaim,
  selectGuestClaimRecovery,
  verifyAndDeleteVerifiedDraft,
  verifyCanonicalReceipt,
  type CanonicalClaimReceipt,
} from "./guestClaimRecovery";

const DRAFT_ID = "11111111-1111-4111-8111-111111111111";
const INTENT_ID = "22222222-2222-4222-822222222222";
const ASSET_ID = "33333333-3333-4333-8333-333333333333";
const CHECKSUM = "a".repeat(64);

function draft(): CreationDraft {
  return {
    id: DRAFT_ID,
    mode: "template",
    status: "auth_required",
    product: { sourceType: "upload", sourceUrl: "", name: "Coffee", description: "Gift set", price: "12.500", brand: "Northfield", images: [] },
    assetKeys: [],
    campaign: { market: "KW", language: "en", arabicDialect: "kuwaiti", dialectRegister: "conversational", vertical: "ecommerce", goal: "launch", presenterMode: "none", location: "", bookingUrl: "", whatsapp: "", offer: "", cta: "Shop now", brandColor: "#d49737", aspectRatio: "9:16", resolution: "720p", subtitles: true, audio: true },
    pendingGenerationId: INTENT_ID,
    returnPath: "/create",
    createdAt: "2026-08-19T08:00:00.000Z",
    updatedAt: "2026-08-19T08:00:00.000Z",
    expiresAt: "2026-08-26T08:00:00.000Z",
  };
}

const manifest = [{ localAssetId: ASSET_ID, ordinal: 0, kind: "product" as const, mimeType: "image/png", sizeBytes: 12, checksumSha256: CHECKSUM }];
const configuration = { creatorProject: { title: "Coffee", campaign: { market: "KW", language: "en" } } };

function receipt(overrides: Partial<CanonicalClaimReceipt> = {}): CanonicalClaimReceipt {
  return {
    status: "ready",
    draftId: DRAFT_ID,
    pendingGenerationId: INTENT_ID,
    snapshotDigest: "b".repeat(64),
    project: {} as CanonicalClaimReceipt["project"],
    version: { configuration } as unknown as CanonicalClaimReceipt["version"],
    assetManifest: manifest,
    ...overrides,
  };
}

describe("guest claim recovery", () => {
  afterEach(() => setGuestDraftStorageForTests());

  it("retains the exact local draft when the canonical receipt has a missing configuration field or checksum mismatch", async () => {
    setGuestDraftStorageForTests(createMemoryGuestDraftStorage());
    await saveGuestDraft(draft());
    const checkpoint = await markClaimCheckpoint(DRAFT_ID, { pendingGenerationId: INTENT_ID, snapshotDigest: "b".repeat(64), configuration, assetManifest: manifest });

    expect(verifyCanonicalReceipt(checkpoint!, receipt({ version: { configuration: {} } as unknown as CanonicalClaimReceipt["version"] }))).toMatchObject({ state: "configuration_mismatch" });
    expect(await verifyAndDeleteVerifiedDraft(DRAFT_ID, receipt({ assetManifest: [{ ...manifest[0]!, checksumSha256: "c".repeat(64) }] }))).toMatchObject({ state: "asset_mismatch" });
    expect(await getGuestDraft(DRAFT_ID)).toMatchObject({ pendingGenerationId: INTENT_ID });
  });

  it("deletes a matching draft once and treats replay as harmless", async () => {
    setGuestDraftStorageForTests(createMemoryGuestDraftStorage());
    const localBlobKey = await putGuestAsset(DRAFT_ID, new File(["image bytes"], "coffee.png", { type: "image/png" }));
    await saveGuestDraft({ ...draft(), assetKeys: [localBlobKey] });
    await markClaimCheckpoint(DRAFT_ID, { pendingGenerationId: INTENT_ID, snapshotDigest: "b".repeat(64), configuration, assetManifest: manifest });

    await expect(verifyAndDeleteVerifiedDraft(DRAFT_ID, receipt())).resolves.toMatchObject({ state: "verified" });
    await expect(getGuestAsset(localBlobKey)).resolves.toBeNull();
    await expect(verifyAndDeleteVerifiedDraft(DRAFT_ID, receipt())).resolves.toEqual({ state: "missing" });
  });

  it("retains local data and gives the later UI a generic wrong-account recovery state", async () => {
    setGuestDraftStorageForTests(createMemoryGuestDraftStorage());
    await saveGuestDraft(draft());

    expect(recoverFailedGuestClaim((await getGuestDraft(DRAFT_ID))!, "wrong_account")).toMatchObject({ state: "wrong_account" });
    expect(await getGuestDraft(DRAFT_ID)).toMatchObject({ pendingGenerationId: INTENT_ID });
  });

  it("maps failures to a single explicit recovery action without changing the draft", () => {
    const original = draft();
    const offline = selectGuestClaimRecovery(original, "network_offline");
    const failedAsset = selectGuestClaimRecovery(original, "asset_claim_failed", { localAssetId: ASSET_ID });

    expect(offline).toEqual({ state: "offline", action: "retry", draft: original });
    expect(failedAsset).toEqual({ state: "claim_failed", action: "retry_asset", localAssetId: ASSET_ID, draft: original });
    expect(offline.draft).toBe(original);
    expect(failedAsset.draft).toBe(original);
  });
});
