import { and, eq, gt, sql } from "drizzle-orm";

import type { Database } from "./client.js";
import {
  assertApprovedCapability,
  assertConfigurationHash,
  GenerationDomainError,
  hashGenerationConfiguration,
} from "./generation-policy.js";
import {
  creatorProjectVersions,
  creditAccounts,
  creditLedger,
  creditReservations,
  entitlements,
  generationQuotes,
  outboxJobs,
  renderRuns,
  type JsonObject,
} from "./schema.js";

const STARTER_ENTITLEMENT_TYPE = "starter_template_render";

export interface CreateGenerationQuoteInput {
  userId?: string;
  templateVersionId?: string;
  capabilityAlias: string;
  credits: number;
  entitlementEligible: boolean;
  breakdown: Array<{ label: string; credits: number }>;
  configuration: unknown;
  expiresAt: Date;
  now?: Date;
}

export interface StartRenderInput {
  userId: string;
  projectId: string;
  projectVersionId: string;
  quoteId: string;
  idempotencyKey: string;
  capabilityAlias: string;
  configuration: unknown;
  now?: Date;
}

export interface FinalizeChargeInput {
  userId: string;
  runId: string;
  provider: string;
  providerRequestId: string;
  now?: Date;
}

export interface RecordProviderSubmissionInput {
  userId: string;
  runId: string;
  provider: string;
  providerRequestId: string;
  now?: Date;
}

export interface RefundRenderInput {
  userId: string;
  runId: string;
  reason: string;
  now?: Date;
}

export interface ReleaseRenderReservationInput {
  userId: string;
  runId: string;
  reason: string;
  terminalStatus?: "failed" | "cancelled";
  now?: Date;
}

export interface GenerationService {
  createQuote(input: CreateGenerationQuoteInput): Promise<typeof generationQuotes.$inferSelect>;
  startRender(input: StartRenderInput): Promise<typeof renderRuns.$inferSelect>;
  recordProviderSubmission(input: RecordProviderSubmissionInput): Promise<typeof renderRuns.$inferSelect>;
  finalizeProviderAccepted(input: FinalizeChargeInput): Promise<typeof renderRuns.$inferSelect>;
  releaseRenderReservation(input: ReleaseRenderReservationInput): Promise<typeof renderRuns.$inferSelect>;
  refundRender(input: RefundRenderInput): Promise<typeof renderRuns.$inferSelect>;
}

function positiveInteger(value: number, field: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${field} must be a non-negative integer`);
  return value;
}

function validateIdempotencyKey(value: string): string {
  const normalized = value.trim();
  if (normalized.length < 8 || normalized.length > 200) {
    throw new GenerationDomainError("idempotency_conflict", "idempotency key must contain 8 to 200 characters");
  }
  return normalized;
}

function renderStartOutboxKey(runId: string): string {
  return `render.start:${runId}`;
}

export function createGenerationService(db: Database): GenerationService {
  return {
    async createQuote(input) {
      assertApprovedCapability(input.capabilityAlias);
      const credits = positiveInteger(input.credits, "credits");
      const now = input.now ?? new Date();
      if (!(input.expiresAt instanceof Date) || !Number.isFinite(input.expiresAt.getTime()) || input.expiresAt <= now) {
        throw new GenerationDomainError("invalid_quote_expiry");
      }
      let breakdownTotal = 0;
      for (const item of input.breakdown) {
        if (!item.label.trim() || !Number.isSafeInteger(item.credits) || item.credits < 0) {
          throw new GenerationDomainError(
            "invalid_quote_breakdown",
            "quote breakdown must contain a label and non-negative integer credits",
          );
        }
        breakdownTotal += item.credits;
      }
      if (!Number.isSafeInteger(breakdownTotal) || breakdownTotal !== credits) {
        throw new GenerationDomainError("invalid_quote_breakdown", "quote breakdown must total the quoted credits");
      }

      const [quote] = await db
        .insert(generationQuotes)
        .values({
          userId: input.userId,
          templateVersionId: input.templateVersionId,
          capabilityAlias: input.capabilityAlias,
          credits,
          entitlementEligible: input.entitlementEligible,
          breakdown: input.breakdown,
          configurationHash: hashGenerationConfiguration(input.configuration),
          expiresAt: input.expiresAt,
          createdAt: now,
        })
        .returning();
      if (!quote) throw new Error("generation quote insert did not return a row");
      return quote;
    },

    async startRender(input) {
      assertApprovedCapability(input.capabilityAlias);
      const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);
      const configurationHash = hashGenerationConfiguration(input.configuration);
      const now = input.now ?? new Date();

      return db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`${input.userId}:${idempotencyKey}`}, 0))`);

        const [existing] = await tx
          .select()
          .from(renderRuns)
          .where(and(eq(renderRuns.userId, input.userId), eq(renderRuns.idempotencyKey, idempotencyKey)))
          .limit(1);
        if (existing) {
          if (
            existing.projectId !== input.projectId ||
            existing.projectVersionId !== input.projectVersionId ||
            existing.quoteId !== input.quoteId ||
            existing.capabilityAlias !== input.capabilityAlias
          ) {
            throw new GenerationDomainError("idempotency_conflict");
          }

          // An idempotency retry may happen after the quote expires, so do not
          // apply the expiry gate again. It must still be the exact payload that
          // created the operation.
          const [boundQuote] = await tx
            .select({
              userId: generationQuotes.userId,
              capabilityAlias: generationQuotes.capabilityAlias,
              configurationHash: generationQuotes.configurationHash,
            })
            .from(generationQuotes)
            .where(eq(generationQuotes.id, existing.quoteId))
            .limit(1);
          if (!boundQuote) throw new GenerationDomainError("quote_not_found");
          if (boundQuote.userId !== input.userId) throw new GenerationDomainError("quote_owner_mismatch");
          if (boundQuote.configurationHash !== configurationHash) {
            throw new GenerationDomainError("quote_configuration_mismatch");
          }
          if (boundQuote.capabilityAlias !== input.capabilityAlias) {
            throw new GenerationDomainError("quote_capability_mismatch");
          }
          return existing;
        }

        const [version] = await tx
          .select({ id: creatorProjectVersions.id })
          .from(creatorProjectVersions)
          .where(
            and(
              eq(creatorProjectVersions.id, input.projectVersionId),
              eq(creatorProjectVersions.projectId, input.projectId),
              eq(creatorProjectVersions.userId, input.userId),
            ),
          )
          .limit(1);
        if (!version) throw new GenerationDomainError("project_version_not_found");

        const [quote] = await tx
          .select()
          .from(generationQuotes)
          .where(and(eq(generationQuotes.id, input.quoteId), gt(generationQuotes.expiresAt, now)))
          .limit(1);
        if (!quote) {
          const [expiredOrMissing] = await tx
            .select({ id: generationQuotes.id })
            .from(generationQuotes)
            .where(eq(generationQuotes.id, input.quoteId))
            .limit(1);
          throw new GenerationDomainError(expiredOrMissing ? "quote_expired" : "quote_not_found");
        }
        // Guests may preview a price, but authenticated submission is always
        // re-quoted and bound to the authenticated owner.
        if (quote.userId !== input.userId) {
          throw new GenerationDomainError("quote_owner_mismatch");
        }
        if (quote.configurationHash !== configurationHash) {
          throw new GenerationDomainError("quote_configuration_mismatch");
        }
        if (quote.capabilityAlias !== input.capabilityAlias) {
          throw new GenerationDomainError("quote_capability_mismatch");
        }

        let starterEntitlementUsed = false;
        if (quote.entitlementEligible) {
          const [reservedEntitlement] = await tx
            .update(entitlements)
            .set({
              status: "reserved",
              reservedOperationKey: idempotencyKey,
              updatedAt: now,
            })
            .where(
              and(
                eq(entitlements.userId, input.userId),
                eq(entitlements.type, STARTER_ENTITLEMENT_TYPE),
                eq(entitlements.status, "available"),
              ),
            )
            .returning({ id: entitlements.id });
          starterEntitlementUsed = Boolean(reservedEntitlement);
          if (!starterEntitlementUsed) {
            throw new GenerationDomainError(
              "starter_entitlement_unavailable",
              "starter entitlement is no longer available; request a new quote",
            );
          }
        }

        let availableCreditAccountLocked = false;
        if (!starterEntitlementUsed && quote.credits > 0) {
          await tx
            .insert(creditAccounts)
            .values({ userId: input.userId, balance: 0 })
            .onConflictDoNothing({ target: creditAccounts.userId });

          const [account] = await tx
            .select({ balance: creditAccounts.balance })
            .from(creditAccounts)
            .where(eq(creditAccounts.userId, input.userId))
            .for("update")
            .limit(1);
          availableCreditAccountLocked = Boolean(account);

          const [activeHolds] = await tx
            .select({ amount: sql<number>`coalesce(sum(${creditReservations.amount}), 0)::integer` })
            .from(creditReservations)
            .where(
              and(
                eq(creditReservations.userId, input.userId),
                eq(creditReservations.status, "reserved"),
              ),
            );
          const reservedCredits = Number(activeHolds?.amount ?? 0);
          if (!account || account.balance - reservedCredits < quote.credits) {
            throw new GenerationDomainError("insufficient_credits");
          }
        }

        const [run] = await tx
          .insert(renderRuns)
          .values({
            projectId: input.projectId,
            projectVersionId: input.projectVersionId,
            userId: input.userId,
            idempotencyKey,
            capabilityAlias: input.capabilityAlias,
            quoteId: quote.id,
            quotedCredits: quote.credits,
            starterEntitlementUsed,
            status: "submitting",
            refundStatus: "not_required",
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        if (!run) throw new Error("render run insert did not return a row");

        if (starterEntitlementUsed) {
          const [entitlement] = await tx
            .update(entitlements)
            .set({ reservedRunId: run.id, updatedAt: now })
            .where(
              and(
                eq(entitlements.userId, input.userId),
                eq(entitlements.type, STARTER_ENTITLEMENT_TYPE),
                eq(entitlements.status, "reserved"),
                eq(entitlements.reservedOperationKey, idempotencyKey),
              ),
            )
            .returning({ id: entitlements.id });
          if (!entitlement) throw new Error("reserved entitlement was lost before render creation");
        } else if (quote.credits > 0) {
          if (!availableCreditAccountLocked) {
            throw new Error("credit account must be locked before reserving credits");
          }
          await tx.insert(creditReservations).values({
            userId: input.userId,
            renderRunId: run.id,
            amount: quote.credits,
            status: "reserved",
            idempotencyKey: `render.reserve:${run.id}`,
            createdAt: now,
            updatedAt: now,
          });
        }

        await tx
          .insert(outboxJobs)
          .values({
            topic: "render.start",
            idempotencyKey: renderStartOutboxKey(run.id),
            payload: {
              runId: run.id,
              userId: input.userId,
              projectId: input.projectId,
              projectVersionId: input.projectVersionId,
              quoteId: quote.id,
              capabilityAlias: input.capabilityAlias,
              configurationHash,
            },
            status: "pending",
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoNothing({ target: outboxJobs.idempotencyKey });

        return run;
      });
    },

    async recordProviderSubmission(input) {
      const now = input.now ?? new Date();
      const provider = input.provider.trim();
      const providerRequestId = input.providerRequestId.trim();
      if (!provider || !providerRequestId) throw new Error("provider and providerRequestId are required");

      return db.transaction(async (tx) => {
        const [run] = await tx
          .select()
          .from(renderRuns)
          .where(and(eq(renderRuns.id, input.runId), eq(renderRuns.userId, input.userId)))
          .for("update")
          .limit(1);
        if (!run) throw new GenerationDomainError("render_not_found");
        if (run.providerRequestId) {
          if (run.provider !== provider || run.providerRequestId !== providerRequestId) {
            throw new GenerationDomainError(
              "idempotency_conflict",
              "render already belongs to a different provider request",
            );
          }
          return run;
        }
        if (run.status !== "submitting" || run.chargedAt) {
          throw new GenerationDomainError("render_submission_not_recordable");
        }

        const [updated] = await tx
          .update(renderRuns)
          .set({ provider, providerRequestId, updatedAt: now })
          .where(and(eq(renderRuns.id, run.id), eq(renderRuns.userId, input.userId)))
          .returning();
        if (!updated) throw new Error("provider submission update did not return a row");
        return updated;
      });
    },

    async finalizeProviderAccepted(input) {
      const now = input.now ?? new Date();
      const provider = input.provider.trim();
      const providerRequestId = input.providerRequestId.trim();
      if (!provider || !providerRequestId) throw new Error("provider and providerRequestId are required");

      return db.transaction(async (tx) => {
        const [run] = await tx
          .select()
          .from(renderRuns)
          .where(and(eq(renderRuns.id, input.runId), eq(renderRuns.userId, input.userId)))
          .for("update")
          .limit(1);
        if (!run) throw new GenerationDomainError("render_not_found");

        if (run.chargedAt) {
          if (run.provider !== provider || run.providerRequestId !== providerRequestId) {
            throw new GenerationDomainError(
              "idempotency_conflict",
              "render was already accepted with a different provider request",
            );
          }
          return run;
        }
        if (run.providerRequestId && (run.provider !== provider || run.providerRequestId !== providerRequestId)) {
          throw new GenerationDomainError("idempotency_conflict", "provider submission does not match the render");
        }
        if (run.status !== "submitting" && run.status !== "queued") {
          throw new GenerationDomainError("render_not_chargeable");
        }

        let chargedCredits = 0;
        if (run.starterEntitlementUsed) {
          const [consumed] = await tx
            .update(entitlements)
            .set({ status: "consumed", consumedAt: now, updatedAt: now })
            .where(
              and(
                eq(entitlements.userId, input.userId),
                eq(entitlements.type, STARTER_ENTITLEMENT_TYPE),
                eq(entitlements.status, "reserved"),
                eq(entitlements.reservedRunId, run.id),
              ),
            )
            .returning({ id: entitlements.id });
          if (!consumed) throw new GenerationDomainError("render_not_chargeable", "starter entitlement is not reserved");
        } else if (run.quotedCredits > 0) {
          const [reservation] = await tx
            .select()
            .from(creditReservations)
            .where(
              and(
                eq(creditReservations.userId, input.userId),
                eq(creditReservations.renderRunId, run.id),
              ),
            )
            .for("update")
            .limit(1);
          if (
            !reservation ||
            reservation.status !== "reserved" ||
            reservation.amount !== run.quotedCredits
          ) {
            throw new GenerationDomainError("render_not_chargeable", "credit reservation is not active");
          }

          const ledgerKey = `render.charge:${run.id}`;
          const [existingLedger] = await tx
            .select()
            .from(creditLedger)
            .where(eq(creditLedger.idempotencyKey, ledgerKey))
            .limit(1);

          if (!existingLedger) {
            const [account] = await tx
              .select({ balance: creditAccounts.balance })
              .from(creditAccounts)
              .where(eq(creditAccounts.userId, input.userId))
              .for("update")
              .limit(1);
            if (!account || account.balance < run.quotedCredits) {
              throw new GenerationDomainError("insufficient_credits");
            }
            const balanceAfter = account.balance - run.quotedCredits;
            await tx
              .update(creditAccounts)
              .set({
                balance: balanceAfter,
                lifetimeSpent: sql`${creditAccounts.lifetimeSpent} + ${run.quotedCredits}`,
                updatedAt: now,
              })
              .where(eq(creditAccounts.userId, input.userId));
            await tx.insert(creditLedger).values({
              userId: input.userId,
              kind: "charge",
              delta: -run.quotedCredits,
              balanceAfter,
              reason: "video_generation",
              referenceType: "render_run",
              referenceId: run.id,
              idempotencyKey: ledgerKey,
              metadata: { provider, providerRequestId },
              createdAt: now,
            });
            chargedCredits = run.quotedCredits;
          } else {
            if (
              existingLedger.userId !== input.userId ||
              existingLedger.delta !== -run.quotedCredits ||
              existingLedger.referenceId !== run.id
            ) {
              throw new GenerationDomainError("idempotency_conflict", "charge ledger key belongs to another charge");
            }
            chargedCredits = Math.abs(existingLedger.delta);
          }

          await tx
            .update(creditReservations)
            .set({
              status: "charged",
              settlementReason: "provider_accepted",
              settledAt: now,
              updatedAt: now,
            })
            .where(eq(creditReservations.id, reservation.id));
        }

        const [updated] = await tx
          .update(renderRuns)
          .set({
            provider,
            providerRequestId,
            chargedCredits,
            chargedAt: now,
            providerAcceptedAt: now,
            status: "queued",
            updatedAt: now,
          })
          .where(and(eq(renderRuns.id, run.id), eq(renderRuns.userId, input.userId)))
          .returning();
        if (!updated) throw new Error("render update did not return a row");
        return updated;
      });
    },

    async releaseRenderReservation(input) {
      const reason = input.reason.trim();
      if (!reason) throw new Error("release reason is required");
      const terminalStatus = input.terminalStatus ?? "failed";
      const now = input.now ?? new Date();

      return db.transaction(async (tx) => {
        const [run] = await tx
          .select()
          .from(renderRuns)
          .where(and(eq(renderRuns.id, input.runId), eq(renderRuns.userId, input.userId)))
          .for("update")
          .limit(1);
        if (!run) throw new GenerationDomainError("render_not_found");
        if (run.chargedAt) throw new GenerationDomainError("render_not_releasable", "render has already been charged");
        if (run.providerRequestId) {
          throw new GenerationDomainError(
            "render_not_releasable",
            "provider submission already exists and must be cancelled through reconciliation",
          );
        }
        const alreadyTerminal = run.status === "failed" || run.status === "cancelled";
        if (run.status !== "submitting" && !alreadyTerminal) {
          throw new GenerationDomainError("render_not_releasable");
        }

        if (run.starterEntitlementUsed) {
          const [released] = await tx
            .update(entitlements)
            .set({
              status: "available",
              reservedRunId: null,
              reservedOperationKey: null,
              consumedAt: null,
              updatedAt: now,
            })
            .where(
              and(
                eq(entitlements.userId, input.userId),
                eq(entitlements.type, STARTER_ENTITLEMENT_TYPE),
                eq(entitlements.status, "reserved"),
                eq(entitlements.reservedRunId, run.id),
              ),
            )
            .returning({ id: entitlements.id });
          if (!released && !alreadyTerminal) {
            throw new GenerationDomainError("render_not_releasable", "starter entitlement reservation is not active");
          }
        } else if (run.quotedCredits > 0) {
          const [reservation] = await tx
            .select()
            .from(creditReservations)
            .where(
              and(
                eq(creditReservations.userId, input.userId),
                eq(creditReservations.renderRunId, run.id),
              ),
            )
            .for("update")
            .limit(1);
          if (!reservation) {
            throw new GenerationDomainError("render_not_releasable", "credit reservation is not active");
          }
          if (reservation.status === "reserved") {
            await tx
              .update(creditReservations)
              .set({
                status: "released",
                settlementReason: reason,
                settledAt: now,
                updatedAt: now,
              })
              .where(eq(creditReservations.id, reservation.id));
          } else if (reservation.status !== "released" || !alreadyTerminal) {
            throw new GenerationDomainError("render_not_releasable", "credit reservation is not active");
          }
        }

        if (alreadyTerminal) return run;

        const [updated] = await tx
          .update(renderRuns)
          .set({
            status: terminalStatus,
            errorCode: terminalStatus === "failed" ? reason : run.errorCode,
            updatedAt: now,
          })
          .where(and(eq(renderRuns.id, run.id), eq(renderRuns.userId, input.userId)))
          .returning();
        if (!updated) throw new Error("render release update did not return a row");
        return updated;
      });
    },

    async refundRender(input) {
      const reason = input.reason.trim();
      if (!reason) throw new Error("refund reason is required");
      const now = input.now ?? new Date();

      return db.transaction(async (tx) => {
        const [run] = await tx
          .select()
          .from(renderRuns)
          .where(and(eq(renderRuns.id, input.runId), eq(renderRuns.userId, input.userId)))
          .for("update")
          .limit(1);
        if (!run) throw new GenerationDomainError("render_not_found");
        if (run.refundStatus === "refunded") return run;
        if (!run.chargedAt) throw new GenerationDomainError("render_not_refundable");

        if (run.starterEntitlementUsed) {
          const [restored] = await tx
            .update(entitlements)
            .set({
              status: "available",
              reservedRunId: null,
              reservedOperationKey: null,
              consumedAt: null,
              updatedAt: now,
            })
            .where(
              and(
                eq(entitlements.userId, input.userId),
                eq(entitlements.type, STARTER_ENTITLEMENT_TYPE),
                eq(entitlements.reservedRunId, run.id),
              ),
            )
            .returning({ id: entitlements.id });
          if (!restored) {
            throw new GenerationDomainError("render_not_refundable", "consumed starter entitlement was not found");
          }
        } else if (run.chargedCredits > 0) {
          const [reservation] = await tx
            .select()
            .from(creditReservations)
            .where(
              and(
                eq(creditReservations.userId, input.userId),
                eq(creditReservations.renderRunId, run.id),
              ),
            )
            .for("update")
            .limit(1);
          if (!reservation || (reservation.status !== "charged" && reservation.status !== "refunded")) {
            throw new GenerationDomainError("render_not_refundable", "charged credit reservation was not found");
          }

          const ledgerKey = `render.refund:${run.id}`;
          const [existingLedger] = await tx
            .select()
            .from(creditLedger)
            .where(eq(creditLedger.idempotencyKey, ledgerKey))
            .limit(1);

          if (!existingLedger) {
            const [account] = await tx
              .select({ balance: creditAccounts.balance })
              .from(creditAccounts)
              .where(eq(creditAccounts.userId, input.userId))
              .for("update")
              .limit(1);
            if (!account) throw new GenerationDomainError("render_not_refundable", "credit account was not found");
            const balanceAfter = account.balance + run.chargedCredits;
            await tx
              .update(creditAccounts)
              .set({
                balance: balanceAfter,
                lifetimeSpent: sql`greatest(0, ${creditAccounts.lifetimeSpent} - ${run.chargedCredits})`,
                updatedAt: now,
              })
              .where(eq(creditAccounts.userId, input.userId));
            await tx.insert(creditLedger).values({
              userId: input.userId,
              kind: "refund",
              delta: run.chargedCredits,
              balanceAfter,
              reason,
              referenceType: "render_run",
              referenceId: run.id,
              idempotencyKey: ledgerKey,
              metadata: { chargeIdempotencyKey: `render.charge:${run.id}` } as JsonObject,
              createdAt: now,
            });
          } else if (
            existingLedger.userId !== input.userId ||
            existingLedger.delta !== run.chargedCredits ||
            existingLedger.referenceId !== run.id
          ) {
            throw new GenerationDomainError("idempotency_conflict", "refund ledger key belongs to another refund");
          }

          await tx
            .update(creditReservations)
            .set({
              status: "refunded",
              settlementReason: reason,
              settledAt: now,
              updatedAt: now,
            })
            .where(eq(creditReservations.id, reservation.id));
        }

        const [updated] = await tx
          .update(renderRuns)
          .set({ refundStatus: "refunded", updatedAt: now })
          .where(and(eq(renderRuns.id, run.id), eq(renderRuns.userId, input.userId)))
          .returning();
        if (!updated) throw new Error("render refund update did not return a row");
        return updated;
      });
    },
  };
}

/** Accept a caller-computed hash only at explicit trust boundaries. */
export function validateGenerationConfigurationHash(hash: string): string {
  return assertConfigurationHash(hash);
}
