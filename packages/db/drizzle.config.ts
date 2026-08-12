import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL_DIRECT;

if (!databaseUrl) {
  throw new Error("DATABASE_URL_DIRECT is required to run Drizzle commands");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
