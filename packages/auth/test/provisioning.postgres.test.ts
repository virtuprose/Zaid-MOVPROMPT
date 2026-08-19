import { randomUUID } from "node:crypto";

import {
  createDatabase,
  creditAccounts,
  entitlements,
  users,
  withUserTransaction,
} from "@movprompt/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createAuthUserProvisioner,
  STARTER_TEMPLATE_RENDER_ENTITLEMENT,
} from "../src/provisioning";

const integrationUrl = process.env.MOVPROMPT_TEST_DATABASE_URL;
const describePostgres = integrationUrl ? describe.sequential : describe.skip;

describePostgres("authentication benefit provisioning in PostgreSQL", () => {
  let database: ReturnType<typeof createDatabase>;

  beforeAll(() => {
    database = createDatabase({
      url: integrationUrl!,
      maxConnections: 3,
      applicationName: "movprompt-auth-provisioning-test",
    });
  });

  afterAll(async () => {
    await database.close();
  });

  async function readBenefits(userId: string) {
    return withUserTransaction(database.db, userId, async (transaction) => ({
      accounts: await transaction.select().from(creditAccounts).where(eq(creditAccounts.userId, userId)),
      entitlements: await transaction.select().from(entitlements).where(eq(entitlements.userId, userId)),
    }));
  }

  it("creates one zero-balance account and grants the starter render only after verification", async () => {
    const userId = randomUUID();
    await database.db.insert(users).values({
      id: userId,
      name: "Provisioning Test",
      email: `${userId}@example.test`,
      emailVerified: false,
    });
    const provisioner = createAuthUserProvisioner(database.db);

    await provisioner.ensure({ id: userId, emailVerified: false });
    expect((await readBenefits(userId)).accounts)
      .toEqual([expect.objectContaining({ userId, balance: 0 })]);
    expect((await readBenefits(userId)).entitlements).toHaveLength(0);

    await database.db.update(users).set({ emailVerified: true }).where(eq(users.id, userId));
    await provisioner.ensureById(userId);
    await provisioner.ensureById(userId);

    expect((await readBenefits(userId)).entitlements)
      .toEqual([
        expect.objectContaining({
          userId,
          type: STARTER_TEMPLATE_RENDER_ENTITLEMENT,
          status: "available",
        }),
      ]);
  });

  it("never resets an existing balance or consumed starter entitlement", async () => {
    const userId = randomUUID();
    await database.db.insert(users).values({
      id: userId,
      name: "Existing Customer",
      email: `${userId}@example.test`,
      emailVerified: true,
    });
    await withUserTransaction(database.db, userId, async (transaction) => {
      await transaction.insert(creditAccounts).values({ userId, balance: 275, lifetimeSpent: 40 });
      await transaction.insert(entitlements).values({
        userId,
        type: STARTER_TEMPLATE_RENDER_ENTITLEMENT,
        status: "consumed",
        consumedAt: new Date(),
      });
    });

    await createAuthUserProvisioner(database.db).ensureById(userId);

    expect((await readBenefits(userId)).accounts)
      .toEqual([expect.objectContaining({ balance: 275, lifetimeSpent: 40 })]);
    expect((await readBenefits(userId)).entitlements)
      .toEqual([expect.objectContaining({ status: "consumed" })]);
  });

  it("grants one starter render before verification when private beta defers verification", async () => {
    const userId = randomUUID();
    await database.db.insert(users).values({
      id: userId,
      name: "Private Beta Creator",
      email: `${userId}@example.test`,
      emailVerified: false,
    });

    const provisioner = createAuthUserProvisioner(database.db, {
      requireEmailVerificationForStarter: false,
    });
    await provisioner.ensure({ id: userId, emailVerified: false });
    await provisioner.ensureById(userId);

    expect((await readBenefits(userId)).entitlements).toEqual([
      expect.objectContaining({
        userId,
        type: STARTER_TEMPLATE_RENDER_ENTITLEMENT,
        status: "available",
      }),
    ]);
  });
});
