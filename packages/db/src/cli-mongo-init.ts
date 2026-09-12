import { createMongoDatabase, mongoConfigFromEnv } from "./mongo-client.js";
import { ensureMongoIndexes } from "./mongo-indexes.js";

const database = createMongoDatabase(mongoConfigFromEnv(process.env));
try {
  await database.connect();
  await ensureMongoIndexes(database);
  console.info("MovPrompt MongoDB indexes are ready");
} finally {
  await database.close();
}
