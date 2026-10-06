# Tuition/Progress Local Execution Receipt

Date: 2026-10-05. User authorized team/cook execution of the named plan. Baseline HEAD `712cc6662b88ed20b747d52ee9598ce5553ac3e9`; dirty main with pre-existing Admin Console changes preserved. No commit, push, dependency install/upgrade, production access, historical repair or deployment.

## Implemented Locally

- R1: billing-mode-aware surcharge; per-session90k plus extra90k=180k; monthly900k/10 plus extra=990k; integer/rounding/zero/free/unsupported-rate guards. Invalid stored finance settings return409. Generator uses the existing scoped raw-lock transaction pattern; tenant model guards remain intact.
- R2/R3: canonical manual/daily/proxy/missing resolution; manual0 valid; daily fallback shown without entering manual blend. Open reads ignore stale score caches. Daily80 survives finalize and independent PostgreSQL revision readback. Finalized original values/rubric snapshots preserved; legacy provenance explicitly unknown.
- R4: immediate preceding-month baseline outside filters; matching source/formula/track/calibration/contributor proportions; same-date averages stable; all intermediate basis changes suppress growth; strict score-drop threshold, no zero-baseline ratio. Mixed unknown performance provenance suppresses weighted comparisons.
- R5: effective month/tenant settings and frozen academic snapshot through timeline/PDF/report; daily track detection consistent with monthly path. Nullable UI/CSV/print formatting and factual evidence labels; stale-response guards and unavailable grader state. Settings simulation preview/save tied to scope/draft/config revision.
- Serializable monthly save/finalize/reopen and daily mutations; bounded conflict retries, in-transaction grader assignment recheck, revisions and audit logs atomic.
- Guarded real HTTP/PG/browser groundwork; fail-closed missing release test target; read-only historical inventory with hashed refs, stable runs and0 writes. `--apply`/production/remote inventory rejected.

## Verification

Captured results/logs: [verification.json](../docs/artifacts/tuition-progress-execution-2026-10-05/verification.json), [evidence index](../docs/artifacts/tuition-progress-execution-2026-10-05/README.md).

| Check | Result |
| --- | --- |
| Root unit | 533/533 PASS,0 skips |
| Admin Console | 216/216 PASS,0 skips |
| Focused remediation/guard/inventory/OCC/fixture safety | 64/64 PASS,0 skips |
| Real authenticated HTTP/PostgreSQL | 15/15 PASS,0 skips |
| Frontend unit | 126/126 PASS,0 skips |
| Typecheck / frontend ESLint zero warnings / frontend build | PASS |
| Focused Node/V8 coverage run | 79/79 tests PASS; aggregate82.23% line/88.35% branch, not whole-app coverage certification |
| Browser daily80/reload | 3/3 PASS,0 skips: desktop1440x900, mobile390x844, tablet768x1024 |
| Local migration | All18 migrations applied on isolated PostgreSQL16, not a dataful Neon rehearsal |
| Inventory | Two identical read-only runs, before/after counts unchanged,0 writes; synthetic local data only |
| Root production dependency audit | FAIL: high undici vulnerabilities |
| Frontend approved security policy | FAIL: unwaived high brace-expansion |

RED evidence preceded pricing/academic fixes. Independent review found invalid settings fallback, composition alerts, stale readiness, mixed unknown weighting, grader race and effective-track gaps; fixes and regressions added. Later review also caught per-skill intermediate-calibration comparability and actual settings-preview gap. Source contracts were updated to follow extracted runtime helpers/permission wrappers, not weakened to bypass financial/auth invariants.

## Release Verdict And Remaining Work

**NO-GO.** TPR-01/05 PARTIAL, TPR-02/03/04 REVIEW, TPR-06 BLOCKED; R1-R5 local fixes REVIEW rather than production/history CLOSED.

- TPR-SEC-01: authorize scoped dependency remediation, assess actual exploitability and re-run policy/full tests. No new waiver was added.
- TPR-COV-01: prove required changed-business90% line/branch, utility100%, API80%, UI70%, overall80%. Focused evidence/tuition/report/finalization branches and API/UI coverage still incomplete; success exits do not enforce these thresholds.
- TPR-HIST-01: approved production-derived dataset, anomaly dispositions/corrections, protected financial/finalized hashes and idempotent apply evidence. Inventory currently detects only and cannot apply.
- Complete all50 scenario groups and requested layers, controlled grader reassignment race, role/error/save/export/PDF parity and high-cardinality open-list performance. Whole-repository review breadth remains PARTIAL.
- Dataful exact Admin Console migration/backfill/schema diff, v3/v4 restore, measured rollback/PITR/RTO/RPO; named finance/academic/release approvals and immutable candidate; authorized canonical deployment and observation.

## Review Surface And Handoff

Runtime changes are in tuition settings/V3/generator, academic settings/evidence/assessment/report/timeline/finalization/operational loader, progress/report/settings-simulation APIs and focused frontend consumers. New tests/harness/target/audit/verification/fixture scripts plus package wiring are reviewable in the dirty diff. Existing unrelated app work was not reverted.

Reproducer: `node --import tsx scripts/verify-tuition-progress.mjs` with guarded isolated environment; overall exit remains nonzero while security fails. Local review server: `http://127.0.0.1:3088`; container `edu-tpr-20261005`, PostgreSQL port15432, database/schema `tpr_test_20261005`. Credentials are synthetic local fixtures and are not exported in evidence.

NM/Context+/MCPProxy unavailable; calls0/0, health unavailable, NM decisions stored0. Markdown workspace memory is fallback; no global memory written. Claude TeamCreate unavailable, adapted to explicitly authorized Codex agents: Aquinas tuition/HTTP, Bacon harness/inventory/docs, Gibbs frontend/settings, Gauss tests, Lorentz independent review; main owns integration.

Test incident: manual cleanup was given browser fixture IDs without verified ownership; only local disposable browser rows were removed, causing401 in the first capture. Reseeded and reran successfully. Cleanup now rejects browser/legacy-unmarked IDs, verifies exact HTTP-owned tenant IDs plus stored names, and does not bypass append-only triggers. A later settings OCC fixture created immutable setting revisions; those owned local graphs are intentionally retained with verified unchanged hashes, not force-deleted. Final captured browser3/3 and HTTP15/15 are real reruns, not waived failures. No production data was implicated.

Final capture timestamp: `2026-10-05T11:57:31.540Z`. Verifier exit1 is expected because both security gates fail, not because product tests fail. `git -c core.safecrlf=false diff --check` passed. Plan/document validator passed13 files/74 links/6-phase acyclic graph/50 unique scenarios/13 gates; this is documentation evidence only.
