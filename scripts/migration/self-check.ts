#!/usr/bin/env bun

import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compareObjectManifests,
  exportRun,
  importRun,
  initializeRun,
  manifestDirectory,
  reconcileRun,
  stableJson,
  transformRun,
} from "./migration";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const fixtureSource = join(scriptDirectory, "fixtures", "source");
const runDirectory = mkdtempSync(join(tmpdir(), "movprompt-migration-self-check-"));
const tables = ["users", "creditAccounts", "creditLedger"];

function readJsonLines(path: string): Array<Record<string, unknown>> {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function writeJsonLines(path: string, rows: Array<Record<string, unknown>>): void {
  writeFileSync(path, `${rows.map(stableJson).join("\n")}\n`, { mode: 0o600 });
}

async function main(): Promise<void> {
  try {
    initializeRun(runDirectory, "fixture-self-check");
    cpSync(fixtureSource, join(runDirectory, "source"), { recursive: true });

    const sourceDryRun = await exportRun({ runDirectory, side: "source", execute: false, tableIds: tables });
    const importDryRunBeforeTransform = await importRun({ runDirectory, execute: false, tableIds: tables });
    assert.equal(sourceDryRun.mode, "dry-run");
    assert.deepEqual(importDryRunBeforeTransform.steps as unknown[], []);

    const firstTransform = await transformRun(runDirectory, tables);
    assert.equal(firstTransform.transformed, 3);
    assert.equal(firstTransform.skipped, 0);
    assert.equal(firstTransform.exceptions.some((item) => item.severity === "blocking"), false);
    assert.equal(firstTransform.exceptions.some((item) => item.code === "credit_lifetime_granted_not_purchase"), true);

    const checkpointPath = join(runDirectory, "checkpoints.json");
    const checkpointsAfterFirstRun = readFileSync(checkpointPath, "utf8");
    const exceptionsAfterFirstRun = readFileSync(join(runDirectory, "exceptions", "transform.jsonl"), "utf8");
    const secondTransform = await transformRun(runDirectory, tables);
    assert.equal(secondTransform.transformed, 0);
    assert.equal(secondTransform.skipped, 3);
    assert.equal(readFileSync(checkpointPath, "utf8"), checkpointsAfterFirstRun);
    assert.equal(readFileSync(join(runDirectory, "exceptions", "transform.jsonl"), "utf8"), exceptionsAfterFirstRun);

    const importDryRun = await importRun({ runDirectory, execute: false, tableIds: tables });
    assert.equal(importDryRun.mode, "dry-run");
    assert.equal((importDryRun.steps as unknown[]).length, 3);
    assert.equal(importDryRun.legacySourceMutation, false);
    assert.equal(importDryRun.targetDeleteStatements, false);
    assert.equal(importDryRun.targetUpdateStatements, false);

    for (const targetFile of ["public.users.jsonl", "public.credit_accounts.jsonl", "public.credit_ledger.jsonl"]) {
      cpSync(join(runDirectory, "target", targetFile), join(runDirectory, "actual-target", targetFile));
    }
    const passingReconciliation = await reconcileRun({ runDirectory, tableIds: tables });
    assert.equal(passingReconciliation.passed, true);
    assert.equal((passingReconciliation.credits as Record<string, unknown>).status, "match");

    const sourceObjects = join(runDirectory, "object-fixtures", "source");
    const targetObjects = join(runDirectory, "object-fixtures", "target");
    mkdirSync(join(sourceObjects, "products"), { recursive: true });
    writeFileSync(join(sourceObjects, "hero.jpg"), "fixture-image-one", { mode: 0o600 });
    writeFileSync(join(sourceObjects, "products", "bottle.png"), "fixture-image-two", { mode: 0o600 });
    cpSync(sourceObjects, targetObjects, { recursive: true });
    const sourceManifest = await manifestDirectory({
      root: sourceObjects,
      bucket: "creator-assets",
      output: join(runDirectory, "source-objects.json"),
    });
    const targetManifest = await manifestDirectory({
      root: targetObjects,
      bucket: "creator-assets",
      output: join(runDirectory, "target-objects.json"),
    });
    assert.equal(sourceManifest.manifestSha256, targetManifest.manifestSha256);
    assert.equal(compareObjectManifests(sourceManifest, targetManifest).status, "match");
    const tamperedManifest = structuredClone(sourceManifest);
    tamperedManifest.entries[0].sizeBytes += 1;
    assert.throws(
      () => compareObjectManifests(tamperedManifest, targetManifest),
      /byte total is invalid|checksum is invalid/,
      "Manifest metadata must be internally verified before comparison.",
    );

    writeFileSync(join(targetObjects, "hero.jpg"), "corrupted-fixture", { mode: 0o600 });
    const changedTargetManifest = await manifestDirectory({
      root: targetObjects,
      bucket: "creator-assets",
      output: join(runDirectory, "changed-target-objects.json"),
    });
    const objectMismatch = compareObjectManifests(sourceManifest, changedTargetManifest);
    assert.equal(objectMismatch.status, "mismatch");
    assert.equal(objectMismatch.checksumMismatches, 1);

    const actualCreditsPath = join(runDirectory, "actual-target", "public.credit_accounts.jsonl");
    const actualCredits = readJsonLines(actualCreditsPath);
    actualCredits[0].balance = Number(actualCredits[0].balance) - 1;
    writeJsonLines(actualCreditsPath, actualCredits);
    const failingReconciliation = await reconcileRun({ runDirectory, tableIds: tables });
    assert.equal(failingReconciliation.passed, false);
    assert.equal((failingReconciliation.credits as Record<string, unknown>).status, "mismatch");

    const invalidCreditRun = join(runDirectory, "invalid-credit-run");
    initializeRun(invalidCreditRun, "invalid-credit-fixture");
    const invalidCreditSource = join(invalidCreditRun, "source", "public.user_credits.jsonl");
    cpSync(join(fixtureSource, "public.user_credits.jsonl"), invalidCreditSource);
    const invalidCreditRows = readJsonLines(invalidCreditSource);
    invalidCreditRows[0].balance = "not-an-integer";
    writeJsonLines(invalidCreditSource, invalidCreditRows);
    const invalidCreditTransform = await transformRun(invalidCreditRun, ["creditAccounts"]);
    assert.equal(invalidCreditTransform.exceptions.some((item) => item.code === "invalid_credit_account_values" && item.severity === "blocking"), true);
    const blockedImport = await importRun({ runDirectory: invalidCreditRun, execute: false, tableIds: ["creditAccounts"] });
    assert.equal(blockedImport.executable, false);
    assert.equal(blockedImport.blockingExceptionCount, 1);

    cpSync(join(runDirectory, "target", "public.credit_accounts.jsonl"), actualCreditsPath);
    const sourceUsersPath = join(runDirectory, "source", "auth.users.jsonl");
    writeFileSync(sourceUsersPath, `${readFileSync(sourceUsersPath, "utf8")}\n`, { mode: 0o600 });
    await assert.rejects(
      () => transformRun(runDirectory, tables),
      /different input checksum/,
      "A checkpoint must reject changed source bytes in the same run directory.",
    );

    console.info(stableJson({
      status: "passed",
      credentialsUsed: false,
      sourceDatabaseMutated: false,
      cases: [
        "dry-run without credentials",
        "fixture transformation",
        "idempotent checkpoint resume",
        "insert-only import plan",
        "table and credit reconciliation",
        "object checksum reconciliation",
        "manifest integrity validation",
        "mismatch detection",
        "invalid credit import blocking",
        "changed-input checkpoint rejection",
      ],
    }));
  } finally {
    rmSync(runDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
