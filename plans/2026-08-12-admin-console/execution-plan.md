# Admin Console Execution Plan

**Program:** `AC-2026-08-12`  
**Source product plan:** `Admin_Console_PRD_Plan.md`  
**Objective:** deliver a tenant-safe control plane without changing existing attendance, tuition, receipt, payment, template, or Student Progress results during migration.

## Non-negotiable invariants

### Release Dependency Added 2026-10-05

The [tuition/progress remediation plan](../2026-10-05-tuition-progress-production/plan.md) closes review findings R1-R5 and adds historical reconciliation and real HTTP/PG/UI/PDF acceptance. The final release package in this detailed plan (AC-12; KANBAN board AC-07) must wait for TPR-05 evidence and the shared Go/No-Go decision. Admin Console foundations and isolated rehearsal remain prerequisites to that evidence; they do not wait for TPR-06 production deployment. This is a release-stage dependency, not a cycle between entire plans.

The work-package statuses below are historical planning labels; current implementation status is maintained in KANBAN and receipts. Reconcile against fresh evidence in TPR-01; this addendum does not promote any runtime task to done.

### Preserved Rules

1. Production data is never used as demo data and is never mutated before an isolated Neon rehearsal passes.
2. Existing business rows remain attached to the default tenant with identical IDs and monetary/academic values.
3. Missing academic evidence remains `null`; tenancy work must not fabricate progress data.
4. Tenant isolation is enforced at authentication, query, nested-write, transaction, cron, raw-SQL, backup, and foreign-key boundaries.
5. A migration cannot advance from expand to constrain until dual-write and backfill verifiers are green.
6. Settings that influence finance or academics are effective-dated and snapshotted into downstream ledgers; historical snapshots win over current configuration.
7. Setting value, revision, tenant `configVersion`, and immutable activity log are written in one transaction.
8. Full-system backup/restore and tenant lifecycle are Platform Owner operations. Tenant admins receive tenant-scoped exports only.

## Corrected release choreography

The PRD's original `nullable -> backfill -> non-null -> runtime scoping` order leaves a deployment window in which new rows can retain `NULL tenantId`. The executable sequence is therefore:

1. **Expand:** add `Tenant`, seed an explicit default tenant, then add nullable `tenantId` and indexes.
2. **Dual-write:** deploy tenant-aware login/session context and tenant injection for all creates/updates while reads remain backward compatible.
3. **Backfill:** populate existing rows in bounded batches and run row-count, null-count, orphan, and cross-tenant relation verifiers.
4. **Constrain:** add composite candidate keys/FKs, partial unique indexes, and `NOT NULL` only after verifier success.
5. **Scoped reads:** switch endpoint groups to tenant clients and fail closed on tenant mismatch.
6. **Special flows:** migrate nested writes, `$transaction`, raw SQL, cron, backup/restore, parent portal, imports, and PDF/template resolution.
7. **Rehearse:** execute the exact checked-in chain on a Neon production branch, restore a v3 backup into v4 schema, run isolation/E2E gates, and record rollback timing.
8. **Release:** take and verify a fresh encrypted backup, deploy migrations and app in the rehearsed order, revoke old sessions, then run canonical production smoke.

## Work packages

| ID | Deliverable | Test-first acceptance | Status |
| --- | --- | --- | --- |
| AC-00 | Tenancy inventory, compatibility contract, release choreography | Inventory accounts for every Prisma model and exceptional flow; no unresolved dependency cycle | IN PROGRESS |
| AC-01 | Backup v4 safety | Schema/manifest parity, v3-to-v4 adapter, all-model round-trip, encrypted envelope verification | PLANNED |
| AC-02 | Expand schema | Default tenant is deterministic; nullable columns preserve current app behavior | PLANNED |
| AC-03 | Tenant auth and dual-write | `tenantSlug + username`; JWT/AuthSession tenant match; suspended tenant rejected; old sessions revoked at cutover | PLANNED |
| AC-04 | Backfill and constraints | Counts unchanged; zero null/orphan/cross-tenant FK rows; tenant composite uniqueness and partial indexes enforced | PLANNED |
| AC-05 | Runtime isolation | Operation matrix covers reads, writes, nested writes, upsert, aggregate, groupBy, transactions and malicious tenant override | PLANNED |
| AC-06 | Endpoint and special-flow isolation | Every endpoint group returns 404/403 for another tenant; cron/import/portal/backup paths have explicit ownership | PLANNED |
| AC-07 | Settings registry and service | Unknown keys rejected; typed resolve/provenance/effective-month/rollback/transactional revision tests pass | PLANNED |
| AC-08 | Admin Console shell | Separate `/admin` layout, route manifest, responsive/a11y/loading/error/empty states, no mock API data | PLANNED |
| AC-09 | Organization, tenants, finance and academic configuration | Permission-gated forms; impact preview; snapshot invariants and regression suites pass | PLANNED |
| AC-10 | Data-driven RBAC | Explicit Platform Owner, permission matrix, route/API parity, re-auth for sensitive actions | PLANNED |
| AC-11 | Flags, integrations and system operations | Fail-closed flags, secret redaction, connection tests, append-only audit, bounded health diagnostics | PLANNED |
| AC-12 | Rehearsal and release | Neon rehearsal, rollback drill, full gates, independent review, canonical production smoke and evidence | PLANNED |

## Identity and access contract

- Login requires `tenantSlug` and `username`; username uniqueness is tenant-local.
- Platform Owner assignment is an explicit migration input. It is never inferred from the smallest user ID.
- Platform Owner remains tenant-bound for ordinary business reads and crosses tenant boundaries only through dedicated platform APIs guarded by `requirePlatformOwner`.
- `AuthSession` stores `tenantId`. Token tenant, session tenant, user tenant, and active tenant must agree on every request.
- The cutover revokes pre-tenant sessions. There is no blind 30-day legacy-token fallback.
- Impersonation is deferred until it has re-authentication, reason, TTL, actor/subject audit, persistent UI banner, and restricted-action policy.

## Data and constraint contract

- Every current Prisma model is explicitly classified in `tenancy-inventory.md`.
- Cross-tenant relations are prevented with composite candidate keys/FKs or transaction-level validation where Prisma cannot express the constraint safely.
- Effective settings use a database partial unique index for the tenant/key default row; PostgreSQL NULL uniqueness is not treated as singleton enforcement.
- Template default uniqueness is `(tenantId, type) WHERE isDefault = true`.
- Existing tuition class allocation remains `MonthlyFeeLine`; no fictional `MonthlyFee.classId` constraint is introduced.

## Verification gates

1. Focused unit tests for each slice.
2. `npx tsc --noEmit`, root unit suite, frontend unit/lint/build.
3. Prisma validate and migration status.
4. Isolated PostgreSQL router and tenant-isolation integration tests.
5. Backup v3/v4 compatibility and all-model round-trip.
6. Neon production-branch migration plus rollback rehearsal.
7. Playwright Platform Owner, tenant admin, receptionist, cross-tenant denial, loading/error/empty, and responsive flows.
8. Independent security/release review before production mutation.

No milestone is `IMPLEMENTED` without linked runtime evidence.
