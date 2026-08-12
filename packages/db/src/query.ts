/**
 * Narrow query helpers for repository packages that depend on @movprompt/db.
 * Keeping these exports here avoids undeclared transitive drizzle-orm imports.
 */
export { and, eq, sql } from "drizzle-orm";
