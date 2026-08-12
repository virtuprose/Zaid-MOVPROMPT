import { fileURLToPath } from "node:url";

import { createDatabase, databaseConfigFromEnv } from "./client.js";
import { migrateDatabase } from "./migrate.js";

const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));
const database = createDatabase(databaseConfigFromEnv(process.env));

try {
  await migrateDatabase(database.db, migrationsFolder);
  console.info("MovPrompt database migrations applied successfully");
} finally {
  await database.close();
}
