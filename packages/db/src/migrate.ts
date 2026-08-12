import { migrate } from "drizzle-orm/postgres-js/migrator";

import type { Database } from "./client.js";

export async function migrateDatabase(db: Database, migrationsFolder: string): Promise<void> {
  if (!migrationsFolder) throw new Error("migrationsFolder is required");
  await migrate(db, { migrationsFolder });
}
