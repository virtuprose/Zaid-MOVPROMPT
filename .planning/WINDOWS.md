---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 3
total_count: 4
last_updated: 2026-08-19T20:42:46.105Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 02 | unrun-verify | apps/api/src/auth-provider-stubs.test.ts |  | PostgreSQL callback replay cases skipped because MOVPROMPT_TEST_DATABASE_URL and Docker are unavailable in this execution environment. | fixed |  | 2026-08-19T19:33:12.375Z | 2026-08-19T20:42:45.933Z |
| 2 | 02 | unrun-verify | apps/api/src/guest-claim-service.postgres.test.ts |  | Disposable PostgreSQL guest-claim replay and owner-isolation suite skipped because MOVPROMPT_TEST_DATABASE_URL is unset. | fixed |  | 2026-08-19T19:49:20.865Z | 2026-08-19T20:42:46.023Z |
| 3 | 02 | unrun-verify | apps/api/src/creator-routes.postgres.test.ts |  | Source-change PostgreSQL replay/concurrency test skipped because MOVPROMPT_TEST_DATABASE_URL is not configured. | fixed |  | 2026-08-19T20:23:02.743Z | 2026-08-19T20:42:46.105Z |
| 4 | 02 | deviation | apps/web/src/features/create/AuthGateDialog.test.tsx |  | Full web suite has a pre-existing order-dependent locale test failure; isolated test passes. | open |  | 2026-08-19T20:23:02.830Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "02",
    "file": "apps/api/src/auth-provider-stubs.test.ts",
    "line": null,
    "description": "PostgreSQL callback replay cases skipped because MOVPROMPT_TEST_DATABASE_URL and Docker are unavailable in this execution environment.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-19T19:33:12.375Z",
    "resolved_at": "2026-08-19T20:42:45.933Z"
  },
  {
    "id": 2,
    "kind": "unrun-verify",
    "phase": "02",
    "file": "apps/api/src/guest-claim-service.postgres.test.ts",
    "line": null,
    "description": "Disposable PostgreSQL guest-claim replay and owner-isolation suite skipped because MOVPROMPT_TEST_DATABASE_URL is unset.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-19T19:49:20.865Z",
    "resolved_at": "2026-08-19T20:42:46.023Z"
  },
  {
    "id": 3,
    "kind": "unrun-verify",
    "phase": "02",
    "file": "apps/api/src/creator-routes.postgres.test.ts",
    "line": null,
    "description": "Source-change PostgreSQL replay/concurrency test skipped because MOVPROMPT_TEST_DATABASE_URL is not configured.",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-19T20:23:02.743Z",
    "resolved_at": "2026-08-19T20:42:46.105Z"
  },
  {
    "id": 4,
    "kind": "deviation",
    "phase": "02",
    "file": "apps/web/src/features/create/AuthGateDialog.test.tsx",
    "line": null,
    "description": "Full web suite has a pre-existing order-dependent locale test failure; isolated test passes.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-19T20:23:02.830Z",
    "resolved_at": null
  }
]
````
