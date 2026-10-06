# Verification Matrix

Status: NOT RUN for implementation acceptance. Owner: QA with finance/academic reviewers.
Contract: [TP-1](business-contract.md). Release mapping: [Go/No-Go](go-no-go.md).

Each ID below is one required scenario group. Implement boundary variants as separate assertions. Record runner, test path/name, fixture identity, candidate SHA, schema/contract version, pass/fail/skip counts and redacted evidence. A skipped required test is NOT RUN, not PASS. Review probes are negative reproductions, not passing acceptance evidence.

Layers: U=unit/domain, H=authenticated real HTTP + PostgreSQL, B=browser/reload, O=operator rehearsal. H must call real business handlers, not only SELECT 1 or router 404.

## Finance: TPR-02

| ID | Case | Required outcome | Layer |
| --- | --- | --- | --- |
| TP-FIN-01 | R1 default per-session 90k regular + surcharge extra | 180k; extra line 90k, not included | U/H/B |
| TP-FIN-02 | Same fixture, extra included | 90k total; reason explicitly included | U/H |
| TP-FIN-03 | Monthly 900k/10 regular + surcharge extra | 990k, denominator remains 10 | U/H |
| TP-FIN-04 | Monthly + per_session_fee without separate rate; N=0; invalid amount | Typed rejection; no partial ledger write or silent zero | U/H |
| TP-FIN-05 | 1,000,001 / 3 slots; input order reversed | Allocations sum exactly to M; deterministic ID/date remainder; pinned extra-rounding output | U |
| TP-FIN-06 | Mid-month join, end-date boundary, leave/rejoin | Only eligible [start,end) sessions charged; full-plan denominator retained | U/H |
| TP-FIN-07 | Present, both absence modes, cancelled, holiday | Existing charge/waiver rules retained; no missing-state default charge | U/H |
| TP-FIN-08 | Same/cross-month makeup; duplicate original link attempts | Original entitlement once; no double charge; invalid links rejected | U/H |
| TP-FIN-09 | Attendance unlocked or plan unfrozen; reopen | Generation denied until valid lock/plan revision; no stale denominator | H |
| TP-FIN-10 | Regenerate confirmed/paid/receipt-linked line | Immutable values/revisions; explicit refusal to overwrite | U/H |
| TP-FIN-11 | Concurrent generate, pay, bulk retry and correction | Single logical charge/receipt, correct aggregate/balance and audited revisions | H |
| TP-FIN-12 | Multi-class fee, discount, partial payment and receipt/PDF | Line sums, fee totals, receipts and balance agree; no cross-class allocation drift | H/B |

## Academic: TPR-03

| ID | Case | Required outcome | Layer |
| --- | --- | --- | --- |
| TP-ACA-01 | R2 academic 60 -> 80, attendance 100 | Delta +20/improving, not -20 | U/H/B |
| TP-ACA-02 | Proxy -> academic; formula/skill-set/track or contributor-weight changes | Null delta + explicit reason; repeated practice cannot silently alter comparison composition | U/H |
| TP-ACA-03 | Filter begins current month; input unsorted; names duplicated | Baseline previous calendar month loaded by IDs; stable results | U/H |
| TP-ACA-04 | Previous calendar month absent | Null trend; do not bridge to older observed month | U/H |
| TP-ACA-05 | Daily-only Listening 80, no monthly skill | Skill 80, overall daily_raw 80; six skills missing | U/H/B |
| TP-ACA-06 | Same evidence save -> finalize -> fresh connection/reload -> PDF | Score/source/contributors unchanged; one immutable revision | H/B |
| TP-ACA-07 | Manual skill 0 + daily80; mixed manual/daily skills | Zero wins for that skill; daily fallback elsewhere; overall contributors match declared mode | U/H |
| TP-ACA-08 | Replace/delete daily records, remove last score, null versus0 | Atomic recompute; no stale score, false zero or deleted evidence | U/H/B |
| TP-ACA-09 | Concurrent finalize and daily replace/delete | Consistent snapshot or conflict; no partial or duplicate revision | H |
| TP-ACA-10 | Finalized mutation/reopen, unauthorized actor, short reason | Direct writes denied; approved reopen retains prior revision and audited reason | H/B |
| TP-ACA-11 | R4 Listening90 then Speaking50 | Per-skill and overall trend null; not -40 | U/H/B |
| TP-ACA-12 | Reorder same-day assessments; repeat same skill/date | Stable means/counts; no same-day longitudinal delta | U/H |
| TP-ACA-13 | Comparable same-skill dates 60 -> 80 | Skill delta +20; aggregates require matching coverage/calibration | U/H |
| TP-ACA-14 | Alert85/100; 84/100; baseline0/missing | Strict threshold: false, true, no ratio alert respectively | U/H |
| TP-ACA-15 | List/detail/timeline same monthly window; custom equal-length window | Same comparator/results for same scope; correct disclosed baseline window | U/H/B |
| TP-ACA-16 | Nonacademic daily type; cumulative practice increases | Does not manufacture score or academic improvement | U/H |

## Settings And Presentation: TPR-04

| ID | Case | Required outcome | Layer |
| --- | --- | --- | --- |
| TP-CFG-01 | R5 raw80, Flyers/Movers, delta0.30 | Weight1.30; performance100; raw80 in API, chart and PDF | U/H/B |
| TP-CFG-02 | Range crosses settings effective month and track change | Each point uses own effective month; incompatible aggregate trend null | U/H/B |
| TP-CFG-03 | Change settings after finalize; old legacy snapshot lacks provenance | Frozen result unchanged; legacy unknown explicit, not current-config backfill | H/B |
| TP-CFG-04 | Invalid explicit setting; missing setting; tenant switch/cache | Invalid rejected; permitted default explicit; no stale/cross-tenant result | U/H |
| TP-CFG-05 | Legacy Cambridge difficulty payload; easy/medium/hard payload | Normalize exam set safely; descriptive difficulty never reinterpreted as track | U/H |
| TP-UI-01 | Student/month filters switched quickly; late responses | Newest scope wins; no stale student's data or edited form overwrite | B |
| TP-UI-02 | Empty/loading/403/404/conflict/network retry | Honest state, no success toast on failure; retry does not duplicate save | B |
| TP-UI-03 | Admin and receptionist daily/monthly input with active assigned grader | Correct permissions; ancillary teacher-fetch must not break otherwise authorized workflow | H/B |
| TP-UI-04 | Raw/performance, list/detail/CSV/print/PDF with same scope | Matching values, null/source/coverage and Vietnamese labels; readable PDF glyphs | B |
| TP-UI-05 | 390px, 768px, 1440px, keyboard-only flow | No overflow/overlap; controls reachable; charts nonblank with expected points | B |
| TP-UI-06 | Cached old client consumes additive API; fresh reload | Existing keys stay compatible; legacy delta=null handled; no NaN or fake0 | U/B |

## Isolation, Data And Recovery: TPR-05/06

| ID | Case | Required outcome | Layer |
| --- | --- | --- | --- |
| TP-SEC-01 | Tenant A request names tenant B student/class/fee/PDF | 403/404 per contract; no B row/count/content leak or writes | H/B |
| TP-SEC-02 | Revoked session, role removed, suspended tenant, parent token on staff route | Fail closed immediately per session contract; parent sees only linked children on existing portal | H/B |
| TP-SEC-03 | Tenant isolation on cron, bulk, nested writes, exports/backups | Explicit ownership; no request-supplied tenant override | H/O |
| TP-DATA-01 | Complete inventory with cutoff and dry-run repeated | Stable anomaly IDs/hashes; no writes; tenant/month totals accounted for | H/O |
| TP-DATA-02 | Draft repair, retry, crash, conflicting concurrent edit | One audited correction; compare-and-swap conflict; resumable without double application | H/O |
| TP-DATA-03 | Confirmed/paid/finalized history and legacy unknown source | Originals unchanged; approved correction/revision trail; all anomalies have verified dispositions | H/O |
| TP-OPS-01 | Isolated Neon exact migration chain with realistic data | Counts, FK/null/tenant invariants, schema diff, auth and business workflows pass | O |
| TP-OPS-02 | Encrypted backup v4 roundtrip and v3-to-v4 on guarded local PG | Manifest matches actual models, relations/snapshots/amounts restored; corruption/key failure fails closed | O |
| TP-OPS-03 | App rollback compatibility and PITR/recovery rehearsal | Measured RTO/RPO; no blind old-app-on-new-schema restore or lost accepted writes | O |
| TP-OPS-04 | Candidate security, static, unit, coverage and real E2E gates | Zero required skips; no open critical/high or release-blocking financial/academic defect | O |
| TP-OPS-05 | Authorized canary, canonical smoke and 24h observation | Same candidate/schema; zero reconciliation, isolation or integrity failure; release owner signs | O/B |

## Harness Work Required

- `tests/postgres-router-harness.test.ts` currently tests SELECT 1 and an unknown route. It is not fee/finalization persistence proof. Extend or add tests that authenticate and invoke actual handlers over HTTP, then read back via an independent Prisma connection.
- `TEST_DATABASE_URL` is optional in the current harness; CI release mode must fail when absent instead of reporting a skipped green run.
- Before importing router/global Prisma modules, bind all data-source paths to the isolated target. Verify database/schema identity on both handler and assertion clients. Reject production endpoints; a permissive remote flag alone is insufficient protection.
- `frontend/playwright.real.config.js` currently matches only two specs and Desktop Chrome. Explicitly include new specs and mobile/tablet projects; prove discovery with Playwright list output and nonzero executed counts.
- Use real login/DB/browser data in an isolated fixture namespace. No request interception replacing business APIs in acceptance runs. Clean only rows owned by that fixture, and verify cleanup.
- Extend test scripts/CI to include new test files; Node's explicit existing file list will not discover them automatically. Record command names only after wiring them.
- Measure coverage, not test count: changed business logic >=90% line/branch, API >=80%, UI >=70%, utilities 100%, overall >=80%, per repository testing policy. Missing coverage tooling is implementation work, not a waived gate.

## Current Commands To Retain

These scripts exist at planning time. They must be rerun on the candidate; listing them is not execution evidence.

```powershell
npm run test:unit
npm run test:admin-console
npm run test:student-progress-safety
npm --prefix frontend run test:unit
npx tsc --noEmit
npm --prefix frontend run lint -- --max-warnings=0
npm run build
npm run audit:frontend-policy
npm audit --omit=dev
git diff --check
```

Run `npm run test:integration:real`, `npm run test:audit-v2:integration` and `npm run test:e2e:real` only after test-target guards and fixture configuration are verified. Expand their coverage as above. Production credentials and backup keys must not appear in logs or evidence.

## Execution Checkpoint - 2026-10-05

Current matrix acceptance: PARTIAL local evidence; all50 groups have NOT been fully executed. The original scenario rows, layers and acceptance requirements remain unchanged. Earlier harness observations describe the planning baseline and are superseded only for the bounded implementation described below.

Main reports focused remediation58/58, real HTTP14/14 with zero skips, PostgreSQL18 migrations applied locally, real browser daily80/reload3/3 across desktop/mobile/tablet, and inventory two identical dry-runs with0 writes. This documentation sidecar inspected test assertions but did not rerun those suites. Main captured root533/533 and admin216/216. Frontend125/125 is builder-reported, pending main runner confirmation; coverage, security, full-matrix and release sign-offs remain pending. Main owns receipt links.

| Test/artifact | Relevant matrix groups | Evidence scope and remaining limits |
| --- | --- | --- |
| [Finance remediation](../../../tests/tuition-production-remediation.test.ts) | TP-FIN-01..05 | Unit examples for180k/included90k/monthly990k, invalid rates, denominator and rounding; required HTTP/browser variants and full finance matrix remain pending. |
| [Academic remediation](../../../tests/student-progress-remediation.test.ts) | TP-ACA-01,02,04..08,11,12; TP-CFG-03 | Unit daily80/manual0, canonical open score, baseline/source changes, same-date order and finalized legacy uncertainty. Finalize-shaped unit input is not real finalization; full boundary/layer acceptance remains pending. |
| [Timeline remediation](../../../tests/student-progress-timeline-remediation.test.ts) | TP-ACA-02,11..16; TP-CFG-01..04 | Unit comparability, calendar/custom baseline, alerts, practice separation, per-month/frozen weighting, invalid settings and tenant loading. Cross-consumer and HTTP/browser/PDF content variants remain pending. |
| [Business HTTP](../../../tests/tuition-progress-http.integration.ts) | TP-FIN-01,09,11; TP-ACA-05,06,08..10; TP-CFG-02,04; TP-UI-03,04; TP-SEC-01 | Local authenticated calculation, invalid-finance-setting409/no writes, lock/plan guard and persisted repeat generation; daily80/finalize/reload, stale monthly/daily GET canonical80, concurrent replacement/finalize, denial/reopen and tenant denial; wrong/inactive grader rejection, effective tenant track/revision parity, and committed replace/delete activity. Delete/activity assertions do not cover every recompute/rollback boundary. FIN-11 covers generation retry only, not concurrent payment/bulk/correction. PDF proves binary/header delivery, not score/source/glyph content parity. No full group is signed off here. |
| [Router harness](../../../tests/postgres-router-harness.test.ts), [target guard](../../../tests/tuition-progress-target-guard.test.ts) | TP-SEC-01,02; TP-OPS-04 groundwork | Exact isolated target/both-client identity, genuine login/session readback, tenant teacher denial and revoked-session denial; release config fails closed. Fee/progress/PDF/cron/bulk isolation breadth, role removal, suspended tenant, parent sessions and full candidate gates remain pending. HTTP14/14 is the main-reported aggregate across real HTTP suites, not14 distinct completed matrix groups. |
| [Browser remediation](../../../frontend/e2e/tuition-progress-remediation.spec.js) | TP-ACA-05; TP-UI-05,06; TP-ACA-11 related null-growth presentation | One real daily80/null-growth/no-NaN/reload scenario executed on desktop/mobile/tablet3/3, including overflow bounds. It does not execute the cross-skill90/50 fixture, finalize/PDF browser flow, old-client compatibility, keyboard/accessibility, all chart checks or all TP-UI states. |
| [Audit tests](../../../tests/tuition-progress-audit.test.ts), [inventory CLI](../../../scripts/audit-tuition-progress.ts) | TP-DATA-01,03; TP-CFG-04 | Unit deterministic IDs/fingerprints, redaction, protected/no-write categories, canonical open-score comparison and explicit unknown/invalid settings; local dry-run repeated twice with0 writes/verified counts. Not a complete production-derived inventory, approved disposition, compensation or recovery rehearsal. TP-DATA-02 apply is unsupported and remains pending. |
| Local PostgreSQL18 migration rehearsal | TP-OPS-01 groundwork | Local migration execution reported by main; does not satisfy the authorized dataful Neon chain, realistic historical counts, schema parity or all migration invariants. |

TP-SEC-03 and TP-OPS-02..05 remain unclosed; backup/restore, PITR/compatibility, measured RTO/RPO, canary/24h observation and production authorization are pending. Unlisted group/layer variants retain their original NOT RUN or pending acceptance state. Test-file existence alone is not execution evidence.

Phase checkpoint: TPR-01 PARTIAL (owner approvals/whole breadth pending); TPR-02..04 REVIEW (local code implemented/full matrix pending); TPR-05 PARTIAL (local-only, production-derived history/recovery pending); TPR-06 BLOCKED. No blanket matrix PASS or production-ready declaration is made. Main owns final candidate receipts, frontend runner confirmation and board updates.
