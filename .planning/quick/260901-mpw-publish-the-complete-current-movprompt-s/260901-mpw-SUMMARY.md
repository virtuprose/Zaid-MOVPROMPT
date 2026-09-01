---
quick_id: 260901-mpw
completed: 2026-09-01
status: complete
repository: https://github.com/virtuprose/Zaid-MOVPROMPT
branch: main
published_snapshot: 911381e6ef6afa51059a24aa2ef9973ab7f97515
---

# Summary — Single-main GitHub publication

## Outcome

The complete canonical MovPrompt project was published to [virtuprose/Zaid-MOVPROMPT](https://github.com/virtuprose/Zaid-MOVPROMPT). The local checkout now uses that repository as its sole `origin`, and both the local and GitHub repositories contain only the authoritative `main` branch.

## Preserved project

- The latest production-rebuild snapshot became `main` without changing application source.
- Every branch that belonged to the active local rebuild was proven reachable from the promoted snapshot before local branch deletion.
- The former repository was used once as a temporary read-only source to complete the shallow history required for a valid GitHub pack, then removed from local remotes.
- Two divergent former-repository branches were classified as superseded legacy lines and were not merged into the canonical React/Hono/PostgreSQL workspace or pushed to the new repository.
- The previously completed durable-continuity verification artifact was preserved.

## Publication safety

- Gitleaks scanned the complete published history: no leaks found.
- The staged publication diff was scanned separately: no leaks found.
- `.env` and `.env.local` remain ignored and were not published.
- Machine-local `.claude/`, `.codex/`, and `.gsd/` runtime directories are explicitly ignored and untracked.
- Git LFS passed local integrity checks; all six LFS objects were uploaded to the new repository.
- The largest reachable Git blob was 29,349,930 bytes, below GitHub's 100,000,000-byte limit.

## Recovery proof

A new single-branch clone from GitHub completed successfully after the LFS upload. It matched local and remote commit `911381e6ef6afa51059a24aa2ef9973ab7f97515`, had a clean worktree, contained the web, API, worker, database, provider, infrastructure, planning, and public-media files, and downloaded all six LFS objects with exact SHA-256 checksum equality.

## Build proof

The authoritative snapshot passed:

- `bun run --cwd apps/web typecheck`
- `bun run --cwd apps/web build`

Vite emitted its existing large-chunk advisory for Analytics and the primary bundle; this is a performance warning, not a build failure.

## Boundaries

This publication proves repository completeness and recoverability. It does not change or waive the existing Phase 04 qualified-human calibration and paid production-canary gates.
