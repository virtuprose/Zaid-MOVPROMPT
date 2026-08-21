# MovPrompt Progress

Updated: 2026-08-21

This is the compact, chat-independent resume file. Product rules remain in `AGENTS.md` and `.planning/PROJECT.md`; scope and exit criteria remain in `.planning/ROADMAP.md`; detailed evidence remains in the Phase 04 plans, summaries, and validation files.

## Durable snapshot

- Branch: `codex/production-rebuild`
- Upstream: `origin/codex/production-rebuild`
- Preserved code snapshot: `d2ce4116ad5d2ac2ae9fbac3deabf6018dbfee01`
- At that snapshot, local hero tests, web typecheck, targeted lint, and the production web build passed.
- `.claude/`, `.codex/`, and `.gsd/` are pre-existing local tool directories. They are not project continuity artifacts and must remain unstaged.

## Exact current position

| Work | Status | Durable evidence |
|---|---|---|
| Phase 04-01: durable lifecycle, private output, truthful state | Complete | [`04-01-SUMMARY.md`](./phases/04-durable-generation-and-accepted-quality/04-01-SUMMARY.md) |
| Task 04-02-01: calibration import, schema, metrics, validator | Implemented | Commits `a8c859e`, `0d38c3c` |
| Task 04-02-02: calibrated acceptance and bounded retries | Implemented; automatic acceptance remains fail-closed without approved calibration | Commits `dab7fd2`, `fa84038`, `90f6f36` |
| Task 04-02-03: qualified-human Kuwait calibration | **Blocking and incomplete** | [`04-02-PLAN.md`](./phases/04-durable-generation-and-accepted-quality/04-02-PLAN.md) |
| Phase 04-03: settlement proof and production canary | Not started | [`04-03-PLAN.md`](./phases/04-durable-generation-and-accepted-quality/04-03-PLAN.md) |

Phase 04-02 and Phase 04 are not complete.

## Latest non-billable proof

Run on 2026-08-21 with the paid-provider confirmation variable removed:

```bash
env -u MOVPROMPT_GATEWAY_CONFIRM_PAID_VIDEO bun run eval:phase04
```

Result: PASS — 9 provider tests; 39 worker tests passed with 2 intentionally skipped; 35 API tests; 2 database tests. No paid provider call was authorized or made.

## Blocking evidence that is absent

- `apps/worker/src/__fixtures__/kw-video-48-v1.calibration.json`
- `.planning/phases/04-durable-generation-and-accepted-quality/04-02-SUMMARY.md`
- `docs/runbooks/PHASE4_PAID_CANARY.md`
- `.planning/phases/04-durable-generation-and-accepted-quality/04-CANARY-EVIDENCE.md`

Automation cannot fabricate, duplicate, infer, or self-approve reviewer labels. Task 04-02-03 requires two genuinely independent qualified-human reviews per candidate, locked submissions, qualified adjudication, role attestations, exact checksums/versions, an authorized approval record, and validator-passing agreement/false-accept thresholds.

## Next safe action

1. Humans complete and approve the exact Task 04-02-03 calibration process.
2. Import that genuine evidence through the implemented validator and rerun the non-billable `eval:phase04` command above.
3. Only after exact-version calibration is approved may Phase 04-03 proceed.
4. Task 04-03-03 still requires a separate, new authorization in the form `Authorize one Seedance 2.5 canary up to USD <cap>`. Prior discussion, account balance, or calibration approval is not paid-call permission.

## Not proven

- Qualified-human calibration approval
- Phase 04-02 or Phase 04 completion
- A real Seedance 2.5 acceptance canary
- Production deployment or production readiness
- Live end-to-end settlement, restart, browser, and accepted-output evidence

## Safe resume read order

1. `AGENTS.md`
2. `.planning/PROJECT.md`
3. `.planning/STATE.md`
4. This `.planning/PROGRESS.md`
5. Phase 04 in `.planning/ROADMAP.md`
6. [`04-01-SUMMARY.md`](./phases/04-durable-generation-and-accepted-quality/04-01-SUMMARY.md)
7. [`04-02-PLAN.md`](./phases/04-durable-generation-and-accepted-quality/04-02-PLAN.md)
8. [`04-03-PLAN.md`](./phases/04-durable-generation-and-accepted-quality/04-03-PLAN.md)
9. [`04-VALIDATION.md`](./phases/04-durable-generation-and-accepted-quality/04-VALIDATION.md)

Repository files and Git history are authoritative. Codex chat history is not.
