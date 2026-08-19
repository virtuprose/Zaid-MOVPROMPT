---
schema_version: 1
open_count: 2
waived_count: 0
fixed_count: 0
total_count: 2
last_updated: 2026-08-19T19:49:20.865Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 02 | unrun-verify | apps/api/src/auth-provider-stubs.test.ts |  | PostgreSQL callback replay cases skipped because MOVPROMPT_TEST_DATABASE_URL and Docker are unavailable in this execution environment. | open |  | 2026-08-19T19:33:12.375Z |  |
| 2 | 02 | unrun-verify | apps/api/src/guest-claim-service.postgres.test.ts |  | Disposable PostgreSQL guest-claim replay and owner-isolation suite skipped because MOVPROMPT_TEST_DATABASE_URL is unset. | open |  | 2026-08-19T19:49:20.865Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "02",
    "file": "apps/api/src/auth-provider-stubs.test.ts",
    "line": null,
    "description": "PostgreSQL callback replay cases skipped because MOVPROMPT_TEST_DATABASE_URL and Docker are unavailable in this execution environment.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-19T19:33:12.375Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "unrun-verify",
    "phase": "02",
    "file": "apps/api/src/guest-claim-service.postgres.test.ts",
    "line": null,
    "description": "Disposable PostgreSQL guest-claim replay and owner-isolation suite skipped because MOVPROMPT_TEST_DATABASE_URL is unset.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-19T19:49:20.865Z",
    "resolved_at": null
  }
]
````
