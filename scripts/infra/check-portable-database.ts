import { fileURLToPath } from "node:url";

import { createDatabase, migrateDatabase } from "../../packages/db/src/index.ts";

const databaseUrl = process.env.DATABASE_URL_DIRECT?.trim();
if (!databaseUrl) {
  throw new Error("DATABASE_URL_DIRECT is required for the portable migration check.");
}

const migrationsFolder = fileURLToPath(
  new URL("../../packages/db/migrations", import.meta.url),
);
const connection = createDatabase({
  url: databaseUrl,
  maxConnections: 1,
  applicationName: "movprompt-migration-check",
});

const requiredTables = [
  "users",
  "sessions",
  "accounts",
  "verifications",
  "video_templates",
  "video_template_versions",
  "creator_projects",
  "creator_project_versions",
  "creator_project_assets",
  "generation_quotes",
  "render_runs",
  "entitlements",
  "credit_accounts",
  "credit_ledger",
  "credit_reservations",
  "exports",
  "payment_bundles",
  "payment_orders",
  "payment_attempts",
  "payment_refunds",
  "payment_events",
  "notifications",
  "audit_logs",
  "outbox_jobs",
] as const;

try {
  await migrateDatabase(connection.db, migrationsFolder);
  // A second run must be a no-op rather than replaying the initial migration.
  await migrateDatabase(connection.db, migrationsFolder);

  const rows = await connection.client<{ table_name: string }[]>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `;
  const actualTables = new Set(rows.map((row) => row.table_name));
  const missingTables = requiredTables.filter((table) => !actualTables.has(table));
  if (missingTables.length > 0) {
    throw new Error(`Portable migration is missing tables: ${missingTables.join(", ")}`);
  }

  console.info(
    `Portable migration check passed; ${requiredTables.length} required tables are present.`,
  );
} finally {
  await connection.close();
}
