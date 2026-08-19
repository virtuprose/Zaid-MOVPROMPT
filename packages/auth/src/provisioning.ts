import {
  creditAccounts,
  entitlements,
  type Database,
  users,
  withUserTransaction,
} from "@movprompt/db";
import { eq } from "drizzle-orm";

export const STARTER_TEMPLATE_RENDER_ENTITLEMENT = "starter_template_render";

export interface ProvisionableAuthUser {
  id: string;
  emailVerified: boolean;
}

export interface AuthUserProvisioner {
  ensure(user: ProvisionableAuthUser): Promise<void>;
  ensureById(userId: string): Promise<void>;
}

export interface AuthBenefitPolicy {
  requireEmailVerificationForStarter: boolean;
}

/**
 * Creates the non-resetting account benefits required by the generation API.
 *
 * The inserts deliberately use conflict-ignore semantics. Replayed auth hooks,
 * OAuth callbacks and later sign-ins must never restore a consumed starter
 * render or replace an existing paid credit balance.
 */
export function createAuthUserProvisioner(
  db: Database,
  policy: AuthBenefitPolicy = { requireEmailVerificationForStarter: true },
): AuthUserProvisioner {
  async function ensure(user: ProvisionableAuthUser): Promise<void> {
    await withUserTransaction(db, user.id, async (transaction) => {
      await transaction
        .insert(creditAccounts)
        .values({ userId: user.id })
        .onConflictDoNothing({ target: creditAccounts.userId });

      if (user.emailVerified || !policy.requireEmailVerificationForStarter) {
        await transaction
          .insert(entitlements)
          .values({
            userId: user.id,
            type: STARTER_TEMPLATE_RENDER_ENTITLEMENT,
          })
          .onConflictDoNothing({
            target: [entitlements.userId, entitlements.type],
          });
      }
    });
  }

  return {
    ensure,
    async ensureById(userId) {
      const [user] = await db
        .select({ id: users.id, emailVerified: users.emailVerified })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (user) await ensure(user);
    },
  };
}

/**
 * Better Auth lifecycle hooks plus a session-created repair path. The session
 * hook self-heals accounts created before this provisioning contract existed.
 */
export function createAuthProvisioningHooks(provisioner: AuthUserProvisioner) {
  return {
    user: {
      create: {
        after: async (user: ProvisionableAuthUser) => {
          await provisioner.ensure(user);
        },
      },
      update: {
        after: async (user: ProvisionableAuthUser) => {
          await provisioner.ensure(user);
        },
      },
    },
    session: {
      create: {
        after: async (session: { userId: string }) => {
          await provisioner.ensureById(session.userId);
        },
      },
    },
  };
}
