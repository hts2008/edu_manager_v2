# Historical Data Reconciliation

Status: DESIGN ONLY. Owner: finance lead + academic lead + database operator.
Execution phase: [TPR-05](../../../plans/2026-10-05-tuition-progress-production/phase-05-data-and-rehearsal.md).

## Safety Boundary

No production repair is permitted until corrected code, target guards, dry-run, isolated rehearsal and explicit operator approval are recorded. Existing `db:reconcile-tuition-v3` is not assumed to implement this contract; inspect before extending or reusing it.

Use sanitized isolated datasets for development. A production-derived branch remains sensitive: restrict access/retention and redact exported artifacts. Do not place student identities, credentials, connection URLs or backup keys in tracked reports.

## 1. Inventory Before Mutation

Pin candidate, contract/formula version, source data cutoff, schema and configuration versions. Enumerate every tenant and affected month, not only recent UI-visible records.

Read through a consistent snapshot or verified revision watermark. Produce stable anonymized anomaly IDs with protected operator-only lookup, not student names. Anomaly output includes:

| Field | Purpose |
| --- | --- |
| tenant/ref, student/ref, class/ref, month | Scoped reconciliation key |
| source revisions + before hash | Detect concurrent edits and prove original state |
| finding IDs and old/new value/source | Explain exactly why the record is affected |
| financial state / academic state / linked receipts | Determine protection and correction route |
| settings/rubric provenance | Avoid inventing historical rules |
| proposed action + owner + approval reference | Explicit disposition |
| operation ID, after hash, validation evidence | Idempotency and closure |

Compare R1 old/new amounts with original session-plan/enrollment/setting snapshots. Compare R2-R5 source, coverage, trend and settings resolution; do not assume every read-time display bug requires a database rewrite.

Classify: unaffected, read-model-only, mutable draft, protected financial, finalized academic, provenance-unknown, invalid configuration. Two unchanged dry-runs must produce identical classifications and totals.

## 2. Correction Rules

| Category | Allowed action | Forbidden action |
| --- | --- | --- |
| Unaffected | Record verified no-op | Touching timestamps/revisions unnecessarily |
| Read-model-only R2/R4/R5 | Deploy verified read fix; compare displayed results | Rewriting original scores to match a chart |
| Open academic/draft fee | Authorized recompute using correct resolver and existing lock preconditions | Updating protected rows through draft tooling |
| Confirmed/paid/receipt-linked fee | Approved compensating class-line correction/adjustment with linked receipt and aggregate reconciliation | In-place overwrite, duplicate receipt, deleting an original charge |
| Finalized academic | Preserve original snapshot; authorized reopen/new revision only when correction needed | Updating immutable snapshot or pretending recalculation is original history |
| Unknown historical provenance | Preserve known values; disclose unavailable comparison; owner verifies source or approves explicit correction | Filling gaps with current settings or fabricated zero |
| Unsupported current pricing config | Resolve policy/rate with owner before next charge | Silently accepting free extra or whole monthly amount as session fee |

Investigate `lib/finance-corrections.ts` and receipt correction handlers before use: generic receipt correction may reject class-line-linked receipts. If no safe compensation workflow exists, implement and test one before affected-record closure; do not bypass the guard with raw SQL.

An undercharge does not itself authorize collecting more money. Finance must decide supplementary collection, refund, credit or documented waiver according to approved center policy. A waiver is an audited financial disposition, not a code-defect waiver. No unresolved incorrect balance may pass release.

## 3. Repair Executor Requirements

Build a guarded operator command only after dry-run schema and approval flow are accepted:

- Default dry-run; explicit apply mode, exact target identity, permitted environment and approved manifest hash required. Reject production unless the separately authorized production procedure is used.
- Bounded batches ordered by stable keys; transaction per logical student/class/month correction. Re-read status, tenant and before revision/hash under appropriate lock; conflict aborts that item for re-inventory.
- Idempotency key binds anomaly ID + desired contract version + approved disposition. Retries cannot create a second adjustment, receipt or academic revision.
- Write audit reason, actor, operation ID and before/after references atomically with changes. Keep a resume/checkpoint ledger; never log private payloads in public artifacts.
- A crash after commit but before acknowledgment is recoverable by idempotency lookup. Failure in one tenant cannot apply another tenant's manifest.
- Undo is a new audited compensating operation where legally/business-appropriate, not deletion of history. Database disaster recovery is a distinct procedure.

## 4. Independent Verification

Use a fresh process/DB connection, not the writer's in-memory return values:

1. Re-run all anomaly detectors. Every item must have a verified disposition; zero unclassified/unowned anomalies.
2. Reconcile per tenant/month: line sum = parent fee totals; balances/receipts/adjustments agree; no orphan or duplicate receipt; cash totals explained.
3. Compare protected originals byte-for-byte or canonical content hashes, excluding only explicitly approved mutable audit fields.
4. Reload daily/monthly/list/timeline/PDF and compare expected source, coverage and values. Verify archived snapshots remain accessible.
5. Re-run dry-run/apply with same manifest: zero additional writes or financial/academic effects.
6. Capture before/after row counts, discrepancy counts, audit references, failed/conflict items and resolution. Totals alone are insufficient: sample every category and verify all protected hashes.

## 5. Closure And Cutover

### Local Inventory Tool

`npm run db:audit-tuition-progress -- --cutoff=2026-10-05T23:59:59Z` now performs two read-only RepeatableRead inventories and verifies unchanged counts. It requires the guarded loopback `tpr_test_*` database/schema and exact datasource binding. Outputs use hashed references and source fingerprints; `--apply`, production mode and remote targets are rejected. Cutoff means created-at inclusion, not historical as-of reconstruction.

This is detection groundwork only. No manifest approval, historical repair, production-derived dataset, protected correction or restore/recovery proof is implied. Operator-approved production-derived rehearsal and mutation workflows remain TPR-05 work.

Historical unresolved pricing, balance or finalized-score errors block release. Explicit `legacy_unknown` can close only when original values are preserved, misleading trends suppressed, available evidence exhausted, and the academic owner signs that honest unavailable history is acceptable. It cannot conceal an actually known incorrect score.

Before cutover, take a fresh inventory delta from the rehearsal cutoff to the approved write-freeze boundary. Reconcile new changes using the same guards. After traffic resumes, observe live discrepancies; never replay the old manifest over newly edited data.

Evidence location during execution: a protected operator store for detailed manifests plus a redacted summary under `docs/artifacts/tuition-progress-release/<candidate>/`. No repair command or production dataset was run/created by this planning task.
