# Phase 02: Tuition Correctness

Task: TPR-02. Finding: R1. Priority: P1. Status: PENDING.
Depends on: TPR-01. Owner: backend owner; reviewer: finance owner.
Gate: G02. Tests: TP-FIN-01..12 in the [matrix](../../docs/production-readiness/tuition-progress/verification-matrix.md).

## Objective

Correct surcharge rate at its source while preserving enrollment, monthly denominator, protected ledger and payment invariants. Do not patch only UI totals.

## Intended Change Surface

- `lib/tuition-settings.ts`: billing-mode-aware rate resolution and validation.
- `lib/tuition-v3-service.ts`: explicit rate basis instead of monthlyAmount=0 ambiguity.
- `lib/tuition-v3.ts`: preserve included/surcharge distinction and deterministic rounding.
- `lib/monthly-fee-generator.ts`, fee calculation/generation APIs and class-line consumers: verify propagation; edit only if required.
- Existing `tests/tuition-v3-service.test.ts`, `tests/tuition-v3.test.ts`, `tests/admin-console-tuition-settings.test.ts`, persistence/locking/generator suites; add real HTTP regression coverage.

## Test-First Work Items

- [ ] TPR-02A: Write desired assertions: 90k regular + surcharge extra must be180k. Capture RED against current code; include explicit included and configured variants.
- [ ] TPR-02B: Implement the approved billing-mode decision table. Invalid monthly rate/N=0 returns a typed failure with no writes; do not silently classify zero as included.
- [ ] TPR-02C: Pin monthly remainder and extra-rounding behavior, overflow/invalid amount guards, free configured rate semantics if such configuration is valid. Separate valid free pricing from missing/invalid rate.
- [ ] TPR-02D: Exercise enrollment boundaries, attendance states, same/cross-month makeup and discount/partial payment in the actual generation path.
- [ ] TPR-02E: Prove lock/plan prerequisites, protected confirmed/paid/receipt-linked rows, idempotent retries and concurrent generate/pay.
- [ ] TPR-02F: Verify HTTP calculation/generation, independent DB readback, fee UI and receipt/PDF amounts; prepare R1 detector inputs for TPR-05.

## Required Evidence

RED/GREEN test output tied to candidate diff; expected/actual line totals; independent ledger/receipt/balance queries on synthetic isolated records; no duplicate effects after retry; protected-row content hashes unchanged.

Both domain and authenticated HTTP checks are required. Stubbed fee services or screenshots alone are not enough. Add new tests to explicit runner lists.

## Exit Criteria

- [ ] TP-FIN-01..12 pass with zero required skips.
- [ ] New finance tests demonstrate 180k and990k worked examples and exact non-divisible rounding.
- [ ] No current protected history was recalculated by deploying the fix.
- [ ] Full root/admin/frontend/static regression checks pass or phase stays PARTIAL with blockers.
- [ ] R1 implementation receipt and board link exist; historical disposition remains separately gated by TPR-05.

Risk: overloaded feePerDay semantics or generic correction bypass. Stop and expand the contract/tests if a caller still treats monthly M as a session rate. Float-to-Decimal migration is not bundled without demonstrated need and a separate compatibility plan.

## Execution Checkpoint - 2026-10-05

Current execution status: REVIEW. R1 code is implemented locally; original acceptance remains unchanged and G02 is not signed.

- [Finance remediation tests](../../tests/tuition-production-remediation.test.ts) cover per-session180k/included90k, monthly990k, denominator/rounding and invalid/ambiguous-rate boundaries. They are part of the main-reported focused58/58 aggregate; no per-phase count is inferred.
- [Real HTTP tests](../../tests/tuition-progress-http.integration.ts) exercise authenticated180k calculation, invalid stored policy409/no ledger writes, lock/plan prerequisites and persisted idempotent generation. Main reports HTTP14/14 with zero skips across the local HTTP suites; this does not close TP-FIN-01..12 in every required layer.
- Still pending: finance owner approval, full finance matrix variants including enrollment/makeup/payment/receipt/PDF and concurrent money writers, same-candidate full regression/coverage/security gates, and historical disposition under TPR-05. Local implementation does not authorize recalculating protected history.
- Main captured root533/533 and admin216/216. Frontend125/125 is builder-reported, pending main runner confirmation; receipt links remain with main.
