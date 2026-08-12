#!/usr/bin/env bun

import { createHash, randomUUID } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { once } from "node:events";

type JsonRecord = Record<string, unknown>;
type MigrationSide = "source" | "target";

type Relation = {
  schema: string;
  table: string;
  key: string[];
  columns: string[];
};

type TablePlan = {
  id: string;
  order: number;
  source: Relation;
  target: Relation;
  transform:
    | "identity"
    | "supabaseUser"
    | "templateVersion"
    | "creatorAsset"
    | "renderRun"
    | "entitlement"
    | "creatorExport"
    | "creditAccount"
    | "creditLedger";
};

type MigrationPlan = {
  version: number;
  sourceLabel: string;
  targetLabel: string;
  tables: TablePlan[];
  sourceInventory: string[];
  targetInventory: string[];
  objectBuckets: Array<{
    source: string;
    target: string;
    requiresPrefixMapping?: boolean;
  }>;
};

type MigrationException = {
  id: string;
  severity: "info" | "warning" | "blocking";
  code: string;
  table?: string;
  sourceKey?: string;
  message: string;
  details?: JsonRecord;
};

type Checkpoint = {
  status: "completed";
  inputSha256: string;
  outputSha256?: string;
  rowCount?: number;
  completedAt: string;
};

type CheckpointFile = {
  format: "movprompt-migration-checkpoints/v1";
  runId: string;
  planSha256: string;
  steps: Record<string, Checkpoint>;
};

type ObjectManifestEntry = {
  bucket: string;
  key: string;
  sizeBytes: number;
  sha256: string;
};

export type ObjectManifest = {
  format: "movprompt-object-manifest/v1";
  bucket: string;
  generatedAt: string;
  entries: ObjectManifestEntry[];
  entryCount: number;
  totalBytes: number;
  manifestSha256: string;
};

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const planPath = join(scriptDirectory, "migration-plan.json");
const identifierPattern = /^[a-z_][a-z0-9_]*$/i;
const now = () => new Date().toISOString();

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonRecord)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function prettyStableJson(value: unknown): string {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function sha256File(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function countLines(path: string): Promise<number> {
  let count = 0;
  for await (const _line of readJsonLines(path, false)) count += 1;
  return count;
}

function assertIdentifier(value: string, label: string): void {
  if (!identifierPattern.test(value)) {
    throw new Error(`Unsafe ${label}: ${value}`);
  }
}

function quoteIdentifier(value: string): string {
  assertIdentifier(value, "SQL identifier");
  return `"${value}"`;
}

function relationName(relation: Pick<Relation, "schema" | "table">): string {
  return `${quoteIdentifier(relation.schema)}.${quoteIdentifier(relation.table)}`;
}

function relationLabel(relation: Pick<Relation, "schema" | "table">): string {
  return `${relation.schema}.${relation.table}`;
}

function parseRelationLabel(label: string): Pick<Relation, "schema" | "table"> {
  const [schema, table, ...rest] = label.split(".");
  if (!schema || !table || rest.length > 0) throw new Error(`Invalid relation label: ${label}`);
  assertIdentifier(schema, "schema");
  assertIdentifier(table, "table");
  return { schema, table };
}

function loadPlan(): MigrationPlan {
  const plan = JSON.parse(readFileSync(planPath, "utf8")) as MigrationPlan;
  if (plan.version !== 1 || !Array.isArray(plan.tables) || plan.tables.length === 0) {
    throw new Error("Unsupported or empty migration plan.");
  }
  const ids = new Set<string>();
  for (const table of plan.tables) {
    if (ids.has(table.id)) throw new Error(`Duplicate table plan id: ${table.id}`);
    ids.add(table.id);
    for (const endpoint of [table.source, table.target]) {
      assertIdentifier(endpoint.schema, "schema");
      assertIdentifier(endpoint.table, "table");
      endpoint.key.forEach((key) => assertIdentifier(key, "key column"));
      endpoint.columns.filter((column) => column !== "*").forEach((column) => assertIdentifier(column, "column"));
    }
  }
  plan.tables.sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
  return plan;
}

const plan = loadPlan();
const planSha256 = sha256Text(stableJson(plan));

function atomicWrite(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  writeFileSync(temporary, content, { mode: 0o600 });
  renameSync(temporary, path);
}

function atomicWriteJson(path: string, value: unknown): void {
  atomicWrite(path, prettyStableJson(value));
}

function datasetPath(runDirectory: string, side: MigrationSide | "expected-target", relation: Pick<Relation, "schema" | "table">): string {
  const directory = side === "source" ? "source" : side === "target" ? "actual-target" : "target";
  return join(runDirectory, directory, `${relationLabel(relation)}.jsonl`);
}

function exceptionPath(runDirectory: string, stage: string): string {
  return join(runDirectory, "exceptions", `${stage}.jsonl`);
}

function checkpointPath(runDirectory: string): string {
  return join(runDirectory, "checkpoints.json");
}

export function initializeRun(runDirectoryInput: string, requestedRunId?: string): { runDirectory: string; runId: string } {
  const runDirectory = resolve(runDirectoryInput);
  mkdirSync(runDirectory, { recursive: true });
  const metadataPath = join(runDirectory, "run.json");
  if (existsSync(metadataPath)) {
    const metadata = JSON.parse(readFileSync(metadataPath, "utf8")) as JsonRecord;
    if (metadata.planSha256 !== planSha256) {
      throw new Error("Migration plan changed after this run was initialized. Create a new run directory.");
    }
    if (typeof metadata.runId !== "string") throw new Error("Run metadata has no runId.");
    return { runDirectory, runId: metadata.runId };
  }

  const runId = requestedRunId || `${new Date().toISOString().replace(/[-:.]/g, "").replace("Z", "Z")}-${randomUUID().slice(0, 8)}`;
  atomicWriteJson(metadataPath, {
    format: "movprompt-migration-run/v1",
    runId,
    createdAt: now(),
    planVersion: plan.version,
    planSha256,
    sourceLabel: plan.sourceLabel,
    targetLabel: plan.targetLabel,
    safety: {
      sourceReadOnly: true,
      targetDeletesAllowed: false,
      targetUpdatesAllowed: false,
      targetInsertConflictPolicy: "do-nothing",
    },
  });
  atomicWriteJson(join(runDirectory, "migration-plan.snapshot.json"), plan);
  atomicWriteJson(checkpointPath(runDirectory), {
    format: "movprompt-migration-checkpoints/v1",
    runId,
    planSha256,
    steps: {},
  } satisfies CheckpointFile);
  mkdirSync(join(runDirectory, "source"), { recursive: true });
  mkdirSync(join(runDirectory, "target"), { recursive: true });
  mkdirSync(join(runDirectory, "actual-target"), { recursive: true });
  mkdirSync(join(runDirectory, "exceptions"), { recursive: true });
  return { runDirectory, runId };
}

function readCheckpoints(runDirectory: string): CheckpointFile {
  const value = JSON.parse(readFileSync(checkpointPath(runDirectory), "utf8")) as CheckpointFile;
  if (value.planSha256 !== planSha256) throw new Error("Checkpoint plan checksum does not match.");
  return value;
}

function completedCheckpoint(runDirectory: string, step: string, inputSha256: string): boolean {
  const checkpoint = readCheckpoints(runDirectory).steps[step];
  if (!checkpoint) return false;
  if (checkpoint.inputSha256 !== inputSha256) {
    throw new Error(`Checkpoint ${step} has a different input checksum. Create a new run directory.`);
  }
  return checkpoint.status === "completed";
}

function markCheckpoint(runDirectory: string, step: string, checkpoint: Omit<Checkpoint, "status" | "completedAt">): void {
  const file = readCheckpoints(runDirectory);
  const existing = file.steps[step];
  if (existing && existing.inputSha256 !== checkpoint.inputSha256) {
    throw new Error(`Refusing to replace checkpoint ${step} with different input.`);
  }
  file.steps[step] = { ...checkpoint, status: "completed", completedAt: now() };
  atomicWriteJson(checkpointPath(runDirectory), file);
}

async function* readJsonLines(path: string, parse = true): AsyncGenerator<JsonRecord | string> {
  const input = createReadStream(path, { encoding: "utf8" });
  const lines = createInterface({ input, crlfDelay: Infinity });
  let lineNumber = 0;
  for await (const line of lines) {
    lineNumber += 1;
    if (!line.trim()) continue;
    if (!parse) {
      yield line;
      continue;
    }
    try {
      const value = JSON.parse(line);
      if (!value || Array.isArray(value) || typeof value !== "object") throw new Error("row is not an object");
      yield value as JsonRecord;
    } catch (error) {
      throw new Error(`${path}:${lineNumber}: invalid JSON object: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

async function writeLine(stream: ReturnType<typeof createWriteStream>, line: string): Promise<void> {
  if (!stream.write(`${line}\n`)) await once(stream, "drain");
}

function makeException(input: Omit<MigrationException, "id">): MigrationException {
  return { ...input, id: sha256Text(stableJson(input)).slice(0, 24) };
}

function writeExceptions(path: string, exceptions: MigrationException[]): void {
  const ordered = [...exceptions].sort((left, right) => left.id.localeCompare(right.id));
  atomicWrite(path, ordered.map(stableJson).join("\n") + (ordered.length ? "\n" : ""));
}

function readExceptions(path: string): MigrationException[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as MigrationException);
}

function selectTablePlans(tableIds?: string[]): TablePlan[] {
  if (!tableIds?.length) return plan.tables;
  const requested = new Set(tableIds);
  const selected = plan.tables.filter((table) => requested.has(table.id));
  const missing = [...requested].filter((id) => !selected.some((table) => table.id === id));
  if (missing.length) throw new Error(`Unknown table plan ids: ${missing.join(", ")}`);
  return selected;
}

function sourceKey(table: TablePlan, row: JsonRecord): string {
  return stableJson(Object.fromEntries(table.source.key.map((key) => [key, row[key]])));
}

function targetKey(table: TablePlan, row: JsonRecord): string {
  return stableJson(Object.fromEntries(table.target.key.map((key) => [key, row[key]])));
}

function copyColumns(row: JsonRecord, columns: string[]): JsonRecord {
  return Object.fromEntries(columns.map((column) => [column, row[column] ?? null]));
}

function objectValue(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function safeInteger(value: unknown): number | null {
  const number = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value)
      : Number.NaN;
  return Number.isSafeInteger(number) ? number : null;
}

function transformRow(table: TablePlan, row: JsonRecord, exceptions: MigrationException[]): JsonRecord | null {
  const key = sourceKey(table, row);
  switch (table.transform) {
    case "identity":
      return copyColumns(row, table.target.columns);
    case "supabaseUser": {
      const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
      if (!email) {
        exceptions.push(makeException({
          severity: "blocking",
          code: "user_missing_email",
          table: relationLabel(table.source),
          sourceKey: key,
          message: "Supabase user has no email and cannot be inserted into Better Auth users.",
        }));
        return null;
      }
      const metadata = objectValue(row.raw_user_meta_data);
      const nameCandidate = metadata.full_name ?? metadata.name ?? email.split("@")[0];
      const imageCandidate = metadata.avatar_url ?? metadata.picture ?? null;
      const localeCandidate = metadata.locale === "ar" ? "ar" : "en";
      return {
        id: row.id,
        name: String(nameCandidate || "MovPrompt user"),
        email,
        email_verified: Boolean(row.email_confirmed_at),
        image: typeof imageCandidate === "string" ? imageCandidate : null,
        role: "user",
        locale: localeCandidate,
        legacy_supabase_user_id: row.id,
        created_at: row.created_at,
        updated_at: row.updated_at ?? row.created_at,
      };
    }
    case "templateVersion":
      return {
        ...copyColumns(row, table.target.columns),
        preview_object_key: row.preview_storage_path ?? null,
        poster_object_key: row.poster_storage_path ?? null,
      };
    case "creatorAsset":
      return {
        ...copyColumns(row, table.target.columns),
        object_key: row.storage_path ?? null,
        duration_ms: row.duration_ms ?? null,
      };
    case "renderRun":
      return {
        ...copyColumns(row, table.target.columns),
        provider: row.provider ?? null,
        output_object_key: row.output_path ?? null,
        provider_accepted_at: row.provider_accepted_at ?? null,
      };
    case "entitlement":
      return {
        ...copyColumns(row, table.target.columns),
        updated_at: row.updated_at ?? row.created_at,
      };
    case "creatorExport":
      return {
        ...copyColumns(row, table.target.columns),
        idempotency_key: row.idempotency_key ?? `legacy-export:${String(row.id)}`,
        output_object_key: row.output_path ?? null,
        width: row.width ?? null,
        height: row.height ?? null,
        duration_ms: row.duration_ms ?? null,
        updated_at: row.updated_at ?? row.completed_at ?? row.created_at,
      };
    case "creditAccount": {
      const balance = safeInteger(row.balance ?? 0);
      const lifetimeGranted = safeInteger(row.lifetime_granted ?? 0);
      const lifetimeSpent = safeInteger(row.lifetime_spent ?? 0);
      if (balance === null || balance < 0 || lifetimeGranted === null || lifetimeGranted < 0 || lifetimeSpent === null || lifetimeSpent < 0) {
        exceptions.push(makeException({
          severity: "blocking",
          code: "invalid_credit_account_values",
          table: relationLabel(table.source),
          sourceKey: key,
          message: "Credit account contains a non-integer or negative balance/lifetime value.",
        }));
        return null;
      }
      if (lifetimeGranted !== 0) {
        exceptions.push(makeException({
          severity: "warning",
          code: "credit_lifetime_granted_not_purchase",
          table: relationLabel(table.source),
          sourceKey: key,
          message: "Legacy lifetime_granted is retained as an exception and is not mislabeled as lifetime_purchased.",
          details: { lifetimeGranted },
        }));
      }
      return {
        user_id: row.user_id,
        balance,
        lifetime_purchased: 0,
        lifetime_spent: lifetimeSpent,
        updated_at: row.updated_at,
      };
    }
    case "creditLedger": {
      const delta = safeInteger(row.delta ?? 0);
      const balanceAfter = safeInteger(row.balance_after);
      const reason = String(row.reason ?? "legacy_credit_entry");
      if (delta === null || balanceAfter === null || balanceAfter < 0) {
        exceptions.push(makeException({
          severity: "blocking",
          code: "invalid_credit_ledger_values",
          table: relationLabel(table.source),
          sourceKey: key,
          message: "Credit ledger contains a non-integer delta or an invalid balance_after value.",
        }));
        return null;
      }
      const normalizedReason = reason.toLowerCase();
      const kind = delta < 0
        ? "charge"
        : normalizedReason.includes("refund")
          ? "refund"
          : normalizedReason.includes("purchase") || normalizedReason.includes("topup")
            ? "purchase"
            : "grant";
      if (delta === 0) {
        exceptions.push(makeException({
          severity: "blocking",
          code: "zero_delta_credit_ledger",
          table: relationLabel(table.source),
          sourceKey: key,
          message: "Portable credit ledger rejects zero-delta rows.",
        }));
        return null;
      }
      return {
        id: row.id,
        user_id: row.user_id,
        kind,
        delta,
        balance_after: balanceAfter,
        reason,
        reference_type: "legacy_supabase",
        reference_id: row.ref_id ?? null,
        idempotency_key: row.idempotency_key ?? `legacy-credit-ledger:${String(row.id)}`,
        metadata: { ...objectValue(row.metadata), legacySource: "supabase.credit_ledger" },
        created_at: row.created_at,
      };
    }
  }
}

export async function transformRun(runDirectoryInput: string, tableIds?: string[]): Promise<{ transformed: number; skipped: number; exceptions: MigrationException[] }> {
  const { runDirectory } = initializeRun(runDirectoryInput);
  const exceptions: MigrationException[] = [];
  let transformed = 0;
  let skipped = 0;

  const selected = selectTablePlans(tableIds);
  if (selected.some((table) => table.id === "users")) {
    exceptions.push(makeException({
      severity: "warning",
      code: "auth_accounts_require_separate_cutover",
      message: "User UUIDs and profiles are prepared, but passwords, OAuth accounts and sessions are not migrated by this tool. Users require the approved Better Auth account cutover or reauthentication flow.",
    }));
    exceptions.push(makeException({
      severity: "warning",
      code: "legacy_admin_roles_require_review",
      message: "All transformed users default to role=user. Legacy user_roles must be reviewed and assigned through the audited admin process.",
    }));
  }

  for (const table of selected) {
    const inputPath = datasetPath(runDirectory, "source", table.source);
    const outputPath = datasetPath(runDirectory, "expected-target", table.target);
    if (!existsSync(inputPath)) {
      exceptions.push(makeException({
        severity: "blocking",
        code: "source_dataset_missing",
        table: relationLabel(table.source),
        message: `No source dataset exists for selected table ${table.id}; transform was skipped and import is blocked.`,
      }));
      continue;
    }
    const inputSha256 = await sha256File(inputPath);
    const checkpointStep = `transform:${table.id}`;
    if (completedCheckpoint(runDirectory, checkpointStep, inputSha256) && existsSync(outputPath)) {
      const checkpoint = readCheckpoints(runDirectory).steps[checkpointStep];
      const currentOutputSha256 = await sha256File(outputPath);
      if (!checkpoint.outputSha256 || checkpoint.outputSha256 !== currentOutputSha256) {
        throw new Error(`Checkpoint ${checkpointStep} output checksum does not match. Restore the artifact or create a new run directory.`);
      }

      // Re-evaluate validations so a resumed run produces the same exception
      // evidence even though the immutable output artifact is not rewritten.
      const seenKeys = new Set<string>();
      for await (const value of readJsonLines(inputPath)) {
        const transformedRow = transformRow(table, value as JsonRecord, exceptions);
        if (!transformedRow) continue;
        const key = targetKey(table, transformedRow);
        if (seenKeys.has(key)) {
          exceptions.push(makeException({
            severity: "blocking",
            code: "duplicate_target_key",
            table: relationLabel(table.target),
            sourceKey: key,
            message: "Two source rows resolve to the same target key.",
          }));
        }
        seenKeys.add(key);
      }
      skipped += 1;
      continue;
    }

    mkdirSync(dirname(outputPath), { recursive: true });
    const temporaryPath = `${outputPath}.${process.pid}.tmp`;
    const output = createWriteStream(temporaryPath, { encoding: "utf8", mode: 0o600 });
    const seenKeys = new Set<string>();
    let rowCount = 0;
    try {
      for await (const value of readJsonLines(inputPath)) {
        const row = value as JsonRecord;
        const transformedRow = transformRow(table, row, exceptions);
        if (!transformedRow) continue;
        const key = targetKey(table, transformedRow);
        if (seenKeys.has(key)) {
          exceptions.push(makeException({
            severity: "blocking",
            code: "duplicate_target_key",
            table: relationLabel(table.target),
            sourceKey: key,
            message: "Two source rows resolve to the same target key.",
          }));
          continue;
        }
        seenKeys.add(key);
        await writeLine(output, stableJson(transformedRow));
        rowCount += 1;
      }
    } finally {
      output.end();
      await once(output, "finish");
    }
    renameSync(temporaryPath, outputPath);
    const outputSha256 = await sha256File(outputPath);
    markCheckpoint(runDirectory, checkpointStep, { inputSha256, outputSha256, rowCount });
    transformed += 1;
  }

  writeExceptions(exceptionPath(runDirectory, "transform"), exceptions);
  return { transformed, skipped, exceptions };
}

function psqlEnvironment(databaseUrl: string, readOnly: boolean): NodeJS.ProcessEnv {
  const existingOptions = process.env.PGOPTIONS?.trim() || "";
  const safetyOptions = readOnly
    ? "-c default_transaction_read_only=on -c statement_timeout=300000 -c lock_timeout=5000"
    : "-c statement_timeout=300000 -c lock_timeout=5000";
  return {
    ...process.env,
    PGDATABASE: databaseUrl,
    PGCONNECT_TIMEOUT: process.env.PGCONNECT_TIMEOUT || "10",
    PGOPTIONS: `${existingOptions} ${safetyOptions}`.trim(),
  };
}

function runPsql(databaseUrl: string, args: string[], readOnly: boolean): string {
  const result = spawnSync("psql", ["--no-psqlrc", "--set=ON_ERROR_STOP=1", ...args], {
    encoding: "utf8",
    env: psqlEnvironment(databaseUrl, readOnly),
  });
  if (result.error) {
    if ((result.error as NodeJS.ErrnoException).code === "ENOENT") throw new Error("psql is required for live migration operations.");
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`psql failed without exposing credentials: ${(result.stderr || result.stdout).trim()}`);
  }
  return result.stdout.trim();
}

function relationExists(databaseUrl: string, relation: Pick<Relation, "schema" | "table">): boolean {
  const literal = relationLabel(relation).replaceAll("'", "''");
  const result = runPsql(databaseUrl, ["--tuples-only", "--no-align", "--command", `SELECT to_regclass('${literal}') IS NOT NULL;`], true);
  return result.split(/\s+/).at(-1) === "t";
}

function connectionFor(side: MigrationSide): string {
  const variable = side === "source" ? "SUPABASE_SOURCE_DATABASE_URL" : "DATABASE_URL_DIRECT";
  const value = process.env[variable]?.trim();
  if (!value) throw new Error(`${variable} is required only when --execute is used for ${side}.`);
  if (!/^postgres(ql)?:\/\//.test(value)) throw new Error(`${variable} must be a PostgreSQL URL.`);
  return value;
}

function psqlMetaPath(path: string): string {
  if (path.includes("\n") || path.includes("\r")) throw new Error("Artifact path cannot contain a newline.");
  return `'${path.replaceAll("'", "''")}'`;
}

function sourceSelect(table: TablePlan, side: MigrationSide): string {
  const endpoint = side === "source" ? table.source : table.target;
  return endpoint.columns[0] === "*" ? "*" : endpoint.columns.map(quoteIdentifier).join(", ");
}

export async function exportRun(input: { runDirectory: string; side: MigrationSide; execute: boolean; tableIds?: string[] }): Promise<JsonRecord> {
  const { runDirectory } = initializeRun(input.runDirectory);
  const selected = selectTablePlans(input.tableIds);
  const dryRun = {
    mode: input.execute ? "execute" : "dry-run",
    side: input.side,
    sourceReadOnlyEnforced: input.side === "source",
    environmentVariable: input.side === "source" ? "SUPABASE_SOURCE_DATABASE_URL" : "DATABASE_URL_DIRECT",
    tables: selected.map((table) => ({
      id: table.id,
      relation: relationLabel(input.side === "source" ? table.source : table.target),
      output: datasetPath(runDirectory, input.side, input.side === "source" ? table.source : table.target),
    })),
  };
  if (!input.execute) return dryRun;

  const checkpoints = readCheckpoints(runDirectory);
  const resumed: TablePlan[] = [];
  const pending: TablePlan[] = [];
  for (const table of selected) {
    const endpoint = input.side === "source" ? table.source : table.target;
    const path = datasetPath(runDirectory, input.side, endpoint);
    const checkpoint = checkpoints.steps[`export:${input.side}:${table.id}`];
    if (!checkpoint) {
      pending.push(table);
      continue;
    }
    if (!existsSync(path)) {
      throw new Error(`Checkpoint export:${input.side}:${table.id} exists but its artifact is missing. Restore it or create a new run directory.`);
    }
    const currentSha256 = await sha256File(path);
    if (!checkpoint.outputSha256 || checkpoint.outputSha256 !== currentSha256) {
      throw new Error(`Checkpoint export:${input.side}:${table.id} output checksum does not match. Restore it or create a new run directory.`);
    }
    resumed.push(table);
  }

  if (pending.length === 0) {
    return {
      ...dryRun,
      connectionOpened: false,
      resumedTables: resumed.map((table) => table.id),
      inventory: await inventoryArtifacts(runDirectory, input.side, selected),
      exceptions: 0,
    };
  }

  const databaseUrl = connectionFor(input.side);
  const existing: TablePlan[] = [];
  const exceptions: MigrationException[] = [];
  for (const table of pending) {
    const endpoint = input.side === "source" ? table.source : table.target;
    if (relationExists(databaseUrl, endpoint)) existing.push(table);
    else exceptions.push(makeException({
      severity: "warning",
      code: "live_relation_missing",
      table: relationLabel(endpoint),
      message: "Relation does not exist in the connected database and was skipped.",
    }));
  }

  const generatedDirectory = join(runDirectory, "generated");
  mkdirSync(generatedDirectory, { recursive: true });
  const sqlPath = join(generatedDirectory, `export-${input.side}.sql`);
  const sql: string[] = [
    "\\set ON_ERROR_STOP on",
    "\\pset tuples_only on",
    "\\pset format unaligned",
    "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;",
  ];
  for (const table of existing) {
    const endpoint = input.side === "source" ? table.source : table.target;
    const outputPath = datasetPath(runDirectory, input.side, endpoint);
    mkdirSync(dirname(outputPath), { recursive: true });
    const orderBy = endpoint.key.map(quoteIdentifier).join(", ");
    sql.push(
      `\\o ${psqlMetaPath(outputPath)}`,
      `SELECT row_to_json(migration_row)::text FROM (SELECT ${sourceSelect(table, input.side)} FROM ${relationName(endpoint)} ORDER BY ${orderBy}) AS migration_row;`,
      "\\o",
    );
  }
  sql.push("COMMIT;", "\\q");
  atomicWrite(sqlPath, `${sql.join("\n")}\n`);
  runPsql(databaseUrl, ["--file", sqlPath], true);

  const inventory = await inventoryArtifacts(runDirectory, input.side, selected);
  writeExceptions(exceptionPath(runDirectory, `export-${input.side}`), exceptions);
  for (const table of existing) {
    const endpoint = input.side === "source" ? table.source : table.target;
    const path = datasetPath(runDirectory, input.side, endpoint);
    const outputSha256 = await sha256File(path);
    markCheckpoint(runDirectory, `export:${input.side}:${table.id}`, {
      inputSha256: planSha256,
      outputSha256,
      rowCount: await countLines(path),
    });
  }
  return {
    ...dryRun,
    connectionOpened: true,
    resumedTables: resumed.map((table) => table.id),
    inventory,
    exceptions: exceptions.length,
  };
}

export async function inventoryArtifacts(runDirectoryInput: string, side: MigrationSide, tables = plan.tables): Promise<JsonRecord> {
  const { runDirectory, runId } = initializeRun(runDirectoryInput);
  const tableRows: JsonRecord[] = [];
  let totalRows = 0;
  for (const table of tables) {
    const endpoint = side === "source" ? table.source : table.target;
    const path = datasetPath(runDirectory, side, endpoint);
    if (!existsSync(path)) {
      tableRows.push({ id: table.id, relation: relationLabel(endpoint), present: false, rowCount: null, sha256: null });
      continue;
    }
    const rowCount = await countLines(path);
    totalRows += rowCount;
    tableRows.push({ id: table.id, relation: relationLabel(endpoint), present: true, rowCount, sha256: await sha256File(path) });
  }
  const inventory = {
    format: "movprompt-table-inventory/v1",
    runId,
    side,
    capturedFrom: "artifacts",
    capturedAt: now(),
    planSha256,
    totalRows,
    tables: tableRows,
  };
  atomicWriteJson(join(runDirectory, `inventory-${side}.json`), inventory);
  return inventory;
}

export function inventoryLive(input: { runDirectory: string; side: MigrationSide; execute: boolean }): JsonRecord {
  const { runDirectory, runId } = initializeRun(input.runDirectory);
  const relations = (input.side === "source" ? plan.sourceInventory : plan.targetInventory).map(parseRelationLabel);
  const dryRun = {
    format: "movprompt-live-inventory-plan/v1",
    runId,
    side: input.side,
    mode: input.execute ? "execute" : "dry-run",
    sourceReadOnlyEnforced: input.side === "source",
    relationCount: relations.length,
    relations: relations.map(relationLabel),
  };
  if (!input.execute) return dryRun;

  const databaseUrl = connectionFor(input.side);
  const rows: JsonRecord[] = [];
  let totalRows = 0;
  for (const relation of relations) {
    if (!relationExists(databaseUrl, relation)) {
      rows.push({ relation: relationLabel(relation), present: false, rowCount: null });
      continue;
    }
    const result = runPsql(databaseUrl, [
      "--tuples-only",
      "--no-align",
      "--command",
      `SELECT count(*)::text FROM ${relationName(relation)};`,
    ], true);
    const count = Number(result.split(/\s+/).at(-1));
    if (!Number.isSafeInteger(count) || count < 0) throw new Error(`Invalid row count for ${relationLabel(relation)}.`);
    totalRows += count;
    rows.push({ relation: relationLabel(relation), present: true, rowCount: count });
  }
  const inventory = {
    format: "movprompt-table-inventory/v1",
    runId,
    side: input.side,
    capturedFrom: "live-database",
    capturedAt: now(),
    planSha256,
    totalRows,
    tables: rows,
  };
  atomicWriteJson(join(runDirectory, `inventory-live-${input.side}.json`), inventory);
  return inventory;
}

async function encodeJsonLinesAsBase64(inputPath: string, outputPath: string): Promise<void> {
  mkdirSync(dirname(outputPath), { recursive: true });
  const output = createWriteStream(outputPath, { encoding: "utf8", mode: 0o600 });
  try {
    for await (const line of readJsonLines(inputPath, false)) {
      await writeLine(output, Buffer.from(line as string, "utf8").toString("base64"));
    }
  } finally {
    output.end();
    await once(output, "finish");
  }
}

export async function importRun(input: { runDirectory: string; execute: boolean; tableIds?: string[] }): Promise<JsonRecord> {
  const { runDirectory } = initializeRun(input.runDirectory);
  const selected = selectTablePlans(input.tableIds).filter((table) => existsSync(datasetPath(runDirectory, "expected-target", table.target)));
  const checkpoints = readCheckpoints(runDirectory);
  const steps = await Promise.all(selected.map(async (table) => {
    const path = datasetPath(runDirectory, "expected-target", table.target);
    const sha256 = await sha256File(path);
    const transformCheckpoint = checkpoints.steps[`transform:${table.id}`];
    return {
      id: table.id,
      relation: relationLabel(table.target),
      input: path,
      sha256,
      rowCount: await countLines(path),
      transformCheckpointValidated: transformCheckpoint?.outputSha256 === sha256,
    };
  }));
  const transformExceptionFile = exceptionPath(runDirectory, "transform");
  const transformExceptions = readExceptions(transformExceptionFile);
  const blockingExceptionCount = transformExceptions.filter((item) => item.severity === "blocking").length;
  const exceptionEvidencePresent = existsSync(transformExceptionFile);
  const executable = steps.length > 0
    && steps.every((step) => step.transformCheckpointValidated)
    && exceptionEvidencePresent
    && blockingExceptionCount === 0;
  const dryRun = {
    format: "movprompt-import-plan/v1",
    mode: input.execute ? "execute" : "dry-run",
    targetOnly: true,
    legacySourceMutation: false,
    targetDeleteStatements: false,
    targetUpdateStatements: false,
    conflictPolicy: "ON CONFLICT DO NOTHING",
    exceptionEvidencePresent,
    blockingExceptionCount,
    executable,
    steps,
  };
  if (!input.execute) return dryRun;
  if (steps.length === 0) throw new Error("No transformed target artifacts are available to import.");
  if (!exceptionEvidencePresent) throw new Error("Transform exception evidence is missing. Run transform before import.");
  if (blockingExceptionCount > 0) throw new Error(`Import blocked by ${blockingExceptionCount} blocking transform exception(s).`);
  if (steps.some((step) => !step.transformCheckpointValidated)) {
    throw new Error("One or more transformed artifacts do not match their immutable transform checkpoints.");
  }

  const databaseUrl = connectionFor("target");
  const generatedDirectory = join(runDirectory, "generated", "import");
  mkdirSync(generatedDirectory, { recursive: true });
  const sql: string[] = [
    "\\set ON_ERROR_STOP on",
    "BEGIN;",
    "SET LOCAL statement_timeout = '5min';",
    "SET LOCAL lock_timeout = '5s';",
  ];
  for (const table of selected) {
    const inputPath = datasetPath(runDirectory, "expected-target", table.target);
    const encodedPath = join(generatedDirectory, `${table.id}.b64`);
    await encodeJsonLinesAsBase64(inputPath, encodedPath);
    const tempTable = `_migration_${table.id.toLowerCase()}`;
    assertIdentifier(tempTable, "temporary table");
    const columns = table.target.columns.map(quoteIdentifier).join(", ");
    const selectedColumns = table.target.columns.map((column) => `migration_record.${quoteIdentifier(column)}`).join(", ");
    sql.push(
      `CREATE TEMP TABLE ${quoteIdentifier(tempTable)} (encoded text NOT NULL) ON COMMIT DROP;`,
      `\\copy ${quoteIdentifier(tempTable)}(encoded) FROM ${psqlMetaPath(encodedPath)} WITH (FORMAT text)`,
      `INSERT INTO ${relationName(table.target)} (${columns})`,
      `SELECT ${selectedColumns}`,
      `FROM ${quoteIdentifier(tempTable)} AS encoded_rows`,
      `CROSS JOIN LATERAL jsonb_populate_record(NULL::${relationName(table.target)}, convert_from(decode(encoded_rows.encoded, 'base64'), 'UTF8')::jsonb) AS migration_record`,
      "ON CONFLICT DO NOTHING;",
      `DROP TABLE ${quoteIdentifier(tempTable)};`,
    );
  }
  sql.push("COMMIT;", "\\q");
  const sqlPath = join(generatedDirectory, "import.sql");
  atomicWrite(sqlPath, `${sql.join("\n")}\n`);
  runPsql(databaseUrl, ["--file", sqlPath], false);
  for (const step of steps) {
    markCheckpoint(runDirectory, `import:${step.id}`, {
      inputSha256: step.sha256,
      rowCount: step.rowCount,
    });
  }
  return dryRun;
}

async function loadRowsByKey(path: string, keys: string[]): Promise<Map<string, string>> {
  const rows = new Map<string, string>();
  for await (const value of readJsonLines(path)) {
    const row = value as JsonRecord;
    for (const name of keys) {
      if (row[name] === undefined || row[name] === null || row[name] === "") {
        throw new Error(`Missing reconciliation key ${name} in ${path}.`);
      }
    }
    const key = stableJson(Object.fromEntries(keys.map((name) => [name, row[name]])));
    if (rows.has(key)) throw new Error(`Duplicate reconciliation key ${key} in ${path}.`);
    rows.set(key, sha256Text(stableJson(row)));
  }
  return rows;
}

async function loadCreditBalances(path: string): Promise<Map<string, number>> {
  const values = new Map<string, number>();
  for await (const value of readJsonLines(path)) {
    const row = value as JsonRecord;
    const userId = String(row.user_id ?? "");
    const balance = Number(row.balance);
    if (!userId || !Number.isSafeInteger(balance) || balance < 0) throw new Error(`Invalid credit balance in ${path}.`);
    if (values.has(userId)) throw new Error(`Duplicate credit account ${userId} in ${path}.`);
    values.set(userId, balance);
  }
  return values;
}

export async function reconcileRun(input: {
  runDirectory: string;
  tableIds?: string[];
  sourceObjectManifest?: string;
  targetObjectManifest?: string;
}): Promise<JsonRecord> {
  const { runDirectory, runId } = initializeRun(input.runDirectory);
  const selected = selectTablePlans(input.tableIds);
  const exceptions: MigrationException[] = [];
  const tables: JsonRecord[] = [];

  for (const table of selected) {
    const expectedPath = datasetPath(runDirectory, "expected-target", table.target);
    const actualPath = datasetPath(runDirectory, "target", table.target);
    if (!existsSync(expectedPath) || !existsSync(actualPath)) {
      exceptions.push(makeException({
        severity: "blocking",
        code: "reconciliation_dataset_missing",
        table: relationLabel(table.target),
        message: `Expected or actual target dataset is missing for ${table.id}.`,
        details: { expectedPresent: existsSync(expectedPath), actualPresent: existsSync(actualPath) },
      }));
      tables.push({ id: table.id, relation: relationLabel(table.target), status: "missing-artifact" });
      continue;
    }
    const expected = await loadRowsByKey(expectedPath, table.target.key);
    const actual = await loadRowsByKey(actualPath, table.target.key);
    let missing = 0;
    let unexpected = 0;
    let mismatched = 0;
    for (const [key, checksum] of expected) {
      if (!actual.has(key)) missing += 1;
      else if (actual.get(key) !== checksum) mismatched += 1;
    }
    for (const key of actual.keys()) if (!expected.has(key)) unexpected += 1;
    const status = missing === 0 && unexpected === 0 && mismatched === 0 ? "match" : "mismatch";
    tables.push({
      id: table.id,
      relation: relationLabel(table.target),
      status,
      expectedRows: expected.size,
      actualRows: actual.size,
      missing,
      unexpected,
      mismatched,
    });
    if (status === "mismatch") {
      exceptions.push(makeException({
        severity: "blocking",
        code: "table_reconciliation_mismatch",
        table: relationLabel(table.target),
        message: "Target table does not match the transformed migration artifact.",
        details: { expectedRows: expected.size, actualRows: actual.size, missing, unexpected, mismatched },
      }));
    }
  }

  let creditReconciliation: JsonRecord | null = null;
  const sourceCredits = datasetPath(runDirectory, "source", { schema: "public", table: "user_credits" });
  const targetCredits = datasetPath(runDirectory, "target", { schema: "public", table: "credit_accounts" });
  if (existsSync(sourceCredits) && existsSync(targetCredits)) {
    const source = await loadCreditBalances(sourceCredits);
    const target = await loadCreditBalances(targetCredits);
    let missingUsers = 0;
    let unexpectedUsers = 0;
    let balanceMismatches = 0;
    for (const [userId, balance] of source) {
      if (!target.has(userId)) missingUsers += 1;
      else if (target.get(userId) !== balance) balanceMismatches += 1;
    }
    for (const userId of target.keys()) if (!source.has(userId)) unexpectedUsers += 1;
    creditReconciliation = {
      status: missingUsers === 0 && unexpectedUsers === 0 && balanceMismatches === 0 ? "match" : "mismatch",
      sourceAccounts: source.size,
      targetAccounts: target.size,
      sourceTotalBalance: [...source.values()].reduce((sum, value) => sum + value, 0),
      targetTotalBalance: [...target.values()].reduce((sum, value) => sum + value, 0),
      missingUsers,
      unexpectedUsers,
      balanceMismatches,
    };
    if (creditReconciliation.status !== "match") {
      exceptions.push(makeException({
        severity: "blocking",
        code: "credit_balance_reconciliation_mismatch",
        message: "Per-user credit balances do not match the read-only Supabase snapshot.",
        details: creditReconciliation,
      }));
    }
  }

  let objectReconciliation: JsonRecord | null = null;
  if (input.sourceObjectManifest || input.targetObjectManifest) {
    if (!input.sourceObjectManifest || !input.targetObjectManifest) {
      throw new Error("Both source and target object manifests are required for object reconciliation.");
    }
    objectReconciliation = compareObjectManifests(
      JSON.parse(readFileSync(resolve(input.sourceObjectManifest), "utf8")) as ObjectManifest,
      JSON.parse(readFileSync(resolve(input.targetObjectManifest), "utf8")) as ObjectManifest,
    );
    if (objectReconciliation.status !== "match") {
      exceptions.push(makeException({
        severity: "blocking",
        code: "object_manifest_reconciliation_mismatch",
        message: "Object key, size or SHA-256 manifest does not match.",
        details: objectReconciliation,
      }));
    }
  }

  const passed = !exceptions.some((item) => item.severity === "blocking");
  const report = {
    format: "movprompt-migration-reconciliation/v1",
    runId,
    createdAt: now(),
    planSha256,
    passed,
    tables,
    credits: creditReconciliation,
    objects: objectReconciliation,
    exceptionCounts: {
      blocking: exceptions.filter((item) => item.severity === "blocking").length,
      warning: exceptions.filter((item) => item.severity === "warning").length,
      info: exceptions.filter((item) => item.severity === "info").length,
    },
  };
  atomicWriteJson(join(runDirectory, "reconciliation.json"), report);
  writeExceptions(exceptionPath(runDirectory, "reconcile"), exceptions);
  return report;
}

function walkFiles(root: string, current = root): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    const path = join(current, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not allowed in object manifests: ${path}`);
    if (entry.isDirectory()) result.push(...walkFiles(root, path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}

export async function manifestDirectory(input: { root: string; bucket: string; output: string; prefix?: string }): Promise<ObjectManifest> {
  assertIdentifier(input.bucket.replaceAll("-", "_"), "bucket");
  const root = resolve(input.root);
  if (!statSync(root).isDirectory()) throw new Error(`Object manifest root is not a directory: ${root}`);
  const prefix = (input.prefix || "").replace(/^\/+|\/+$/g, "");
  const entries: ObjectManifestEntry[] = [];
  for (const path of walkFiles(root).sort()) {
    const relativePath = relative(root, path);
    if (relativePath.startsWith("..") || relativePath.split(sep).includes("..")) throw new Error("Object escaped manifest root.");
    const normalized = relativePath.split(sep).join("/");
    entries.push({
      bucket: input.bucket,
      key: prefix ? `${prefix}/${normalized}` : normalized,
      sizeBytes: statSync(path).size,
      sha256: await sha256File(path),
    });
  }
  entries.sort((left, right) => left.key.localeCompare(right.key));
  const manifest: ObjectManifest = {
    format: "movprompt-object-manifest/v1",
    bucket: input.bucket,
    generatedAt: now(),
    entries,
    entryCount: entries.length,
    totalBytes: entries.reduce((sum, entry) => sum + entry.sizeBytes, 0),
    manifestSha256: sha256Text(stableJson(entries)),
  };
  atomicWriteJson(resolve(input.output), manifest);
  return manifest;
}

export function compareObjectManifests(source: ObjectManifest, target: ObjectManifest): JsonRecord {
  const sourceRows = validateObjectManifest(source, "source");
  const targetRows = validateObjectManifest(target, "target");
  let missing = 0;
  let unexpected = 0;
  let sizeMismatches = 0;
  let checksumMismatches = 0;
  for (const [key, sourceEntry] of sourceRows) {
    const targetEntry = targetRows.get(key);
    if (!targetEntry) missing += 1;
    else {
      if (targetEntry.sizeBytes !== sourceEntry.sizeBytes) sizeMismatches += 1;
      if (targetEntry.sha256 !== sourceEntry.sha256) checksumMismatches += 1;
    }
  }
  for (const key of targetRows.keys()) if (!sourceRows.has(key)) unexpected += 1;
  return {
    status: missing === 0 && unexpected === 0 && sizeMismatches === 0 && checksumMismatches === 0 ? "match" : "mismatch",
    sourceEntries: sourceRows.size,
    targetEntries: targetRows.size,
    missing,
    unexpected,
    sizeMismatches,
    checksumMismatches,
    sourceManifestSha256: source.manifestSha256,
    targetManifestSha256: target.manifestSha256,
    sourceBucket: source.bucket,
    targetBucket: target.bucket,
  };
}

function validateObjectManifest(manifest: ObjectManifest, label: string): Map<string, ObjectManifestEntry> {
  if (manifest.format !== "movprompt-object-manifest/v1" || !Array.isArray(manifest.entries)) {
    throw new Error(`Invalid ${label} object manifest format.`);
  }
  if (manifest.entryCount !== manifest.entries.length) {
    throw new Error(`${label} object manifest entry count does not match its entries.`);
  }
  const totalBytes = manifest.entries.reduce((sum, entry) => sum + entry.sizeBytes, 0);
  if (!Number.isSafeInteger(totalBytes) || totalBytes < 0 || totalBytes !== manifest.totalBytes) {
    throw new Error(`${label} object manifest byte total is invalid.`);
  }
  const digest = sha256Text(stableJson(manifest.entries));
  if (digest !== manifest.manifestSha256) {
    throw new Error(`${label} object manifest checksum is invalid.`);
  }
  const rows = new Map<string, ObjectManifestEntry>();
  for (const entry of manifest.entries) {
    if (!entry.key || entry.key.startsWith("/") || entry.key.includes("\\") || entry.key.split("/").includes("..")) {
      throw new Error(`${label} object manifest contains an unsafe key.`);
    }
    if (!Number.isSafeInteger(entry.sizeBytes) || entry.sizeBytes < 0 || !/^[0-9a-f]{64}$/.test(entry.sha256)) {
      throw new Error(`${label} object manifest contains invalid size or SHA-256 metadata for ${entry.key}.`);
    }
    if (rows.has(entry.key)) throw new Error(`${label} object manifest contains duplicate key ${entry.key}.`);
    rows.set(entry.key, entry);
  }
  return rows;
}

type CliOptions = Record<string, string | boolean>;

function parseCli(arguments_: string[]): { command: string; options: CliOptions } {
  const [command = "help", ...rest] = arguments_;
  const options: CliOptions = {};
  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (!item.startsWith("--")) throw new Error(`Unexpected argument: ${item}`);
    const [rawKey, inlineValue] = item.slice(2).split("=", 2);
    if (!rawKey) throw new Error("Empty option name.");
    if (inlineValue !== undefined) options[rawKey] = inlineValue;
    else if (rest[index + 1] && !rest[index + 1].startsWith("--")) options[rawKey] = rest[++index];
    else options[rawKey] = true;
  }
  return { command, options };
}

function requiredOption(options: CliOptions, name: string): string {
  const value = options[name];
  if (typeof value !== "string" || !value.trim()) throw new Error(`--${name} is required.`);
  return value;
}

function boolOption(options: CliOptions, name: string): boolean {
  const value = options[name];
  if (value === undefined) return false;
  if (value === true || value === "true") return true;
  if (value === "false") return false;
  throw new Error(`--${name} must be true or false.`);
}

function tableOption(options: CliOptions): string[] | undefined {
  const value = options.tables;
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function sideOption(options: CliOptions): MigrationSide {
  const value = requiredOption(options, "side");
  if (value !== "source" && value !== "target") throw new Error("--side must be source or target.");
  return value;
}

function printHelp(): void {
  console.info(`MovPrompt safe migration tooling\n\nCommands:\n  init --run-dir PATH [--run-id ID]\n  plan [--tables id,id]\n  export --run-dir PATH --side source|target [--tables id,id] [--execute]\n  inventory --run-dir PATH --side source|target [--execute]\n  transform --run-dir PATH [--tables id,id]\n  import --run-dir PATH [--tables id,id] [--execute]\n  reconcile --run-dir PATH [--tables id,id] [--source-objects FILE --target-objects FILE]\n  object-manifest --root PATH --bucket NAME --out FILE [--prefix PREFIX]\n  object-reconcile --source FILE --target FILE [--out FILE]\n\nExport and import default to credential-free dry-run; --execute is required before a connection is opened.\nInventory without --execute inventories local artifacts; inventory --execute reads live counts.\nSource connections use SUPABASE_SOURCE_DATABASE_URL with PostgreSQL read-only mode.\nTarget connections use DATABASE_URL_DIRECT. Imports never issue UPDATE, DELETE, TRUNCATE, DROP on persistent relations, or ON CONFLICT DO UPDATE.`);
}

async function main(): Promise<void> {
  const { command, options } = parseCli(process.argv.slice(2));
  if (command === "help" || boolOption(options, "help")) {
    printHelp();
    return;
  }
  let result: unknown;
  switch (command) {
    case "init":
      result = initializeRun(requiredOption(options, "run-dir"), typeof options["run-id"] === "string" ? options["run-id"] : undefined);
      break;
    case "plan": {
      const selected = selectTablePlans(tableOption(options));
      result = {
        format: "movprompt-migration-plan/v1",
        mode: "dry-run",
        credentialsRequired: false,
        planSha256,
        sourceReadOnly: true,
        tables: selected,
        objectBuckets: plan.objectBuckets,
      };
      break;
    }
    case "export":
      result = await exportRun({ runDirectory: requiredOption(options, "run-dir"), side: sideOption(options), execute: boolOption(options, "execute"), tableIds: tableOption(options) });
      break;
    case "inventory":
      result = boolOption(options, "execute")
        ? inventoryLive({ runDirectory: requiredOption(options, "run-dir"), side: sideOption(options), execute: true })
        : await inventoryArtifacts(requiredOption(options, "run-dir"), sideOption(options), selectTablePlans(tableOption(options)));
      break;
    case "transform":
      result = await transformRun(requiredOption(options, "run-dir"), tableOption(options));
      break;
    case "import":
      result = await importRun({ runDirectory: requiredOption(options, "run-dir"), execute: boolOption(options, "execute"), tableIds: tableOption(options) });
      break;
    case "reconcile":
      result = await reconcileRun({
        runDirectory: requiredOption(options, "run-dir"),
        tableIds: tableOption(options),
        sourceObjectManifest: typeof options["source-objects"] === "string" ? options["source-objects"] : undefined,
        targetObjectManifest: typeof options["target-objects"] === "string" ? options["target-objects"] : undefined,
      });
      break;
    case "object-manifest":
      result = await manifestDirectory({
        root: requiredOption(options, "root"),
        bucket: requiredOption(options, "bucket"),
        output: requiredOption(options, "out"),
        prefix: typeof options.prefix === "string" ? options.prefix : undefined,
      });
      break;
    case "object-reconcile": {
      const source = JSON.parse(readFileSync(resolve(requiredOption(options, "source")), "utf8")) as ObjectManifest;
      const target = JSON.parse(readFileSync(resolve(requiredOption(options, "target")), "utf8")) as ObjectManifest;
      result = compareObjectManifests(source, target);
      if (typeof options.out === "string") atomicWriteJson(resolve(options.out), result);
      break;
    }
    default:
      throw new Error(`Unknown command: ${command}`);
  }
  console.info(prettyStableJson(result).trimEnd());
  if (command === "reconcile" && (result as JsonRecord).passed === false) process.exitCode = 2;
  if (command === "object-reconcile" && (result as JsonRecord).status !== "match") process.exitCode = 2;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
