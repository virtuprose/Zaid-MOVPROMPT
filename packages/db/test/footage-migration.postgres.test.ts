import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.MOVPROMPT_TEST_DATABASE_URL?.trim();

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll("\"", "\"\"")}"`;
}

if (databaseUrl) describe("footage migration compatibility", () => {
  const databaseName = `movprompt_footage_migration_${randomUUID().replaceAll("-", "")}`;
  const targetUrl = new URL(databaseUrl);
  targetUrl.pathname = `/${databaseName}`;
  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";
  const admin = postgres(adminUrl.toString(), { max: 1 });
  let db: postgres.Sql | undefined;

  beforeAll(async () => {
    await admin.unsafe(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    db = postgres(targetUrl.toString(), { max: 1 });
    await db.unsafe(`
      CREATE TYPE asset_kind AS ENUM ('product', 'reference', 'footage');
      CREATE TABLE creator_project_assets (
        id uuid PRIMARY KEY,
        asset_kind asset_kind NOT NULL,
        mime_type text NOT NULL,
        size_bytes bigint NOT NULL,
        duration_ms integer,
        checksum_sha256 text
      );
      CREATE TABLE guest_claim_assets (
        id uuid PRIMARY KEY,
        asset_kind asset_kind NOT NULL,
        mime_type text NOT NULL,
        size_bytes bigint NOT NULL,
        duration_ms integer
      );
      ALTER TABLE creator_project_assets ADD CONSTRAINT creator_assets_footage_metadata CHECK (
        asset_kind <> 'footage' OR (
          mime_type IN ('video/mp4', 'video/quicktime', 'video/webm')
          AND size_bytes > 0 AND duration_ms > 0 AND duration_ms <= 600000 AND checksum_sha256 IS NOT NULL
        )
      );
      ALTER TABLE guest_claim_assets ADD CONSTRAINT guest_claim_assets_footage_metadata CHECK (
        asset_kind <> 'footage' OR (
          mime_type IN ('video/mp4', 'video/quicktime', 'video/webm')
          AND duration_ms > 0 AND duration_ms <= 600000
        )
      );
      INSERT INTO creator_project_assets VALUES ('11111111-1111-4111-8111-111111111111', 'footage', 'video/webm', 2048, 10000, repeat('a', 64));
      INSERT INTO guest_claim_assets VALUES ('22222222-2222-4222-8222-222222222222', 'footage', 'video/webm', 2048, 10000);
    `);
    const migration = await readFile(new URL("../migrations/0019_tighten_footage_verification.sql", import.meta.url), "utf8");
    for (const statement of migration.split("--> statement-breakpoint").map((value) => value.trim()).filter(Boolean)) {
      await db.unsafe(statement);
    }
  });

  afterAll(async () => {
    await db?.end({ timeout: 5 }).catch(() => undefined);
    await admin.unsafe(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`).catch(() => undefined);
    await admin.end({ timeout: 5 });
  });

  it("preserves legal legacy WebM rows while enforcing MP4/MOV for new writes", async () => {
    const client = db!;
    await expect(client`SELECT id FROM creator_project_assets WHERE mime_type = 'video/webm'`)
      .resolves.toHaveLength(1);
    await expect(client`SELECT id FROM guest_claim_assets WHERE mime_type = 'video/webm'`)
      .resolves.toHaveLength(1);

    const constraints = await client<[{ conname: string; convalidated: boolean }]>`
      SELECT conname, convalidated
      FROM pg_constraint
      WHERE conname IN ('creator_assets_footage_metadata', 'guest_claim_assets_footage_metadata')
      ORDER BY conname
    `;
    expect(constraints).toEqual([
      { conname: "creator_assets_footage_metadata", convalidated: false },
      { conname: "guest_claim_assets_footage_metadata", convalidated: false },
    ]);

    await expect(client.unsafe(
      "INSERT INTO creator_project_assets VALUES ('33333333-3333-4333-8333-333333333333', 'footage', 'video/webm', 2048, 10000, repeat('b', 64))",
    )).rejects.toThrow();
    await expect(client.unsafe(
      "INSERT INTO guest_claim_assets VALUES ('44444444-4444-4444-8444-444444444444', 'footage', 'video/webm', 2048, 10000)",
    )).rejects.toThrow();
    await expect(client.unsafe(
      "INSERT INTO creator_project_assets VALUES ('55555555-5555-4555-8555-555555555555', 'footage', 'video/mp4', 2048, 10000, repeat('c', 64))",
    )).resolves.toBeDefined();
  });
}, 30_000);
else describe.skip("footage migration compatibility", () => {
  it("requires MOVPROMPT_TEST_DATABASE_URL for a disposable PostgreSQL 17 database", () => {});
});
