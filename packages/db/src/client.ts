import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { schema } from "./schema.js";

export interface DatabaseConfig {
  url: string;
  maxConnections?: number;
  idleTimeoutSeconds?: number;
  connectTimeoutSeconds?: number;
  ssl?: false | "require";
  applicationName?: string;
}

export function createDatabase(config: DatabaseConfig) {
  if (!config.url) throw new Error("Database URL is required");

  const client = postgres(config.url, {
    max: config.maxConnections ?? 10,
    idle_timeout: config.idleTimeoutSeconds ?? 20,
    connect_timeout: config.connectTimeoutSeconds ?? 10,
    ssl: config.ssl === "require" ? "require" : false,
    connection: {
      application_name: config.applicationName ?? "movprompt",
      timezone: "UTC",
    },
    prepare: false,
  });

  const db = drizzle(client, { schema });

  return {
    db,
    client,
    async close() {
      await client.end({ timeout: 5 });
    },
  };
}

export type Database = ReturnType<typeof createDatabase>["db"];

export function databaseConfigFromEnv(env: NodeJS.ProcessEnv = process.env): DatabaseConfig {
  const url = env.DATABASE_URL_DIRECT?.trim() || env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL_DIRECT or DATABASE_URL is required");

  const maxConnections = env.DATABASE_POOL_MAX ? Number(env.DATABASE_POOL_MAX) : undefined;
  if (maxConnections !== undefined && (!Number.isInteger(maxConnections) || maxConnections < 1)) {
    throw new Error("DATABASE_POOL_MAX must be a positive integer");
  }

  return {
    url,
    maxConnections,
    ssl: env.DATABASE_SSL === "require" ? "require" : false,
    applicationName: env.DATABASE_APPLICATION_NAME?.trim() || "movprompt",
  };
}
