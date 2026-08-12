import { sql } from "drizzle-orm";

import type { Database } from "./client.js";

export type UserScopedTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Opens the mandatory ownership boundary for authenticated API work. RLS uses
 * the transaction-local user ID as defense in depth; repositories must still
 * include explicit owner predicates so privileged worker connections remain
 * safe when reusing read helpers.
 */
export function withUserTransaction<T>(
  db: Database,
  userId: string,
  operation: (transaction: UserScopedTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (transaction) => {
    await transaction.execute(sql`select set_config('movprompt.user_id', ${userId}, true)`);
    return operation(transaction);
  });
}
