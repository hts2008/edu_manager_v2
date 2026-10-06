# Business Contract: Tuition And Progress

Contract version: proposed TP-1. Owner acceptance: PENDING in TPR-01.
Source: [review R1-R5](../../../reports/2026-10-05-system-review/review.md).
Examples are synthetic; no student production data is included.

## 1. Preserved Invariants

- Production path: React -> `api/router.ts` -> `server/api` -> domain libraries -> Prisma/PostgreSQL. Reference SQLite behavior is not acceptance evidence.
- All identities, settings, reads, writes, cron operations and audit events are tenant-scoped. Student/class/month identity uses IDs, never names.
- Enrollment is `[startedAt, endedAt)`. Monthly denominator is the frozen class plan's regular slots for the billing month, not attended slots.
- Finance generation requires the appropriate locked attendance period and frozen plan. Confirmed, paid or receipt-linked lines cannot be silently recalculated.
- Class-line ledger is authoritative; parent fee totals, receipts, balance and reporting must reconcile. Bulk retries must not duplicate receipts or charges.
- Raw score is evidence. Performance-adjusted score is a separate view. Missing is `null`, not zero. Practice volume is not achievement.
- Monthly manual input is not overwritten by daily edits. Finalized evidence/configuration are immutable snapshots; reopen requires authorized actor, reason and a new revision.
- Cambridge `exam_set_level` and descriptive `difficulty_level` (`easy|medium|hard`) remain separate; cached-client normalization remains supported.

## 2. R1: Extra Session Pricing

`feePerDay` currently means a session rate in `per_session`, but a monthly package amount in `monthly_prorated`. Never pass one as the other.

| Billing mode | Extra policy / setting | Required result |
| --- | --- | --- |
| per_session | included, any setting | Extra amount 0 with explicit included reason |
| per_session | surcharge, derive_monthly default | Use the class session rate; do not derive from monthlyAmount=0 |
| per_session | surcharge, per_session_fee | Use the class session rate |
| monthly_prorated | included | Extra amount 0 with explicit included reason |
| monthly_prorated | surcharge, derive_monthly | M/N according to existing deterministic VND rounding; N is frozen planned regular count |
| monthly_prorated | surcharge, per_session_fee | Requires an independently defined session-rate source; do not interpret monthly M as one-session fee |
| monthly_prorated | surcharge, N=0 or absent rate | Reject ambiguous charge with a typed validation error; never silently turn surcharge into included |

Proposed minimal policy: reject the unsupported monthly/per_session_fee combination on new configuration/charge attempts until an explicit rate is specified in an approved contract. Inventory existing usage first; do not change valid historical snapshots. TPR-01 decides whether an additive rate field is necessary.

Required examples:
- 90,000 VND/session + regular present + extra present/surcharge = 180,000 VND; included extra = 90,000 VND.
- 900,000 VND/month, 10 regular slots + one eligible surcharge extra = 990,000 VND; with included extra = 900,000 VND.
- 1,000,001 VND / 3 regular slots: stable date/ID remainder allocation; regular allocations sum to exactly 1,000,001. Preserve the existing extra-rounding rule and pin its exact output in TPR-01; do not invent a second rule in UI or reconciliation.

Attendance eligibility remains unchanged: present/absent_with_fee charged; absent_no_fee waived; cancellation/holiday and eligible makeup handled by original-session rules. A makeup must not become a second regular charge. Cross-month makeup must retain original billing-month entitlement.

Amounts must be finite, nonnegative, safe integer VND at ledger boundaries. Preserve tested rounding for intermediate division. Audit_V2's deferred Float-to-Decimal change is not automatically reopened; discovered precision failures block release and require a scoped fix.

## 3. R3: Evidence Resolution And Monthly Score

Implement one canonical resolver used by daily recomputation, monthly upsert/finalize, report, timeline and PDF. Persisted open-month caches cannot override recomputed evidence without a verified matching input revision.

### Skill Evidence

For each of the seven skills, use explicit non-null manual monthly evidence first, otherwise that skill's valid daily assessments, otherwise missing. A manual score of zero is valid. Attendance and unrelated activity types cannot manufacture an academic skill score.

Daily skill aggregation must be deterministic: arithmetic mean of valid assessment entries for that skill in the selected period; daily display points aggregate within `(date, skill)`. Reordering entries cannot change the result. Evidence count and distinct assessed-date count are separate fields.

### Overall Score Modes

Proposed compatibility-first policy avoids silently redefining all existing daily-only scores:

| score_source | Overall score | Contributor meaning |
| --- | --- | --- |
| manual_monthly | Existing approved monthly rubric, default skills 60%, attendance 25%, consistency 15% | Only explicit manual skills enter its academic component; existing missing-skill normalization must be pinned by tests |
| daily_raw | Existing daily-only raw aggregate, default arithmetic mean of valid skill-assessment entries | Daily evidence only; no added attendance blend |
| operational_proxy | Existing operational formula when academic evidence is absent | Attendance/consistency proxy, never represented as assessed academic attainment |
| missing | null when no applicable evidence supports a score | Distinct from a genuine score of zero |

Showing a daily fallback skill does not imply it contributes to `manual_monthly`. Return contributor/source metadata so the distinction is testable and visible. If owners choose a unified blend instead, version the formula, assess impact and revise tests before implementation; never mix versions in a trend.

Daily-only Listening 80 must show Listening 80 and overall raw 80 before and after an otherwise unchanged finalize, including reload and PDF. It must not switch to attendance proxy 100 or a newly blended 88.

For open periods, daily save/replace/delete recomputes all dependent aggregates atomically. Removing the last academic entry transitions source explicitly; it must not preserve a stale academic score. Empty/missing operational evidence must not fabricate an attained score.

### Finalization

Validate tenant, grader/class assignment, actor permission, period status and input revision within the transaction. Read evidence/configuration, derive values, insert one revision and finalize atomically. Concurrent daily mutation/finalize yields one consistent revision or an explicit conflict/retry, never a mixed snapshot.

Snapshot must capture score source, contributors, coverage, formula/rubric version, effective settings/config version, track/calibration and evidence revision. Prefer extending existing JSON snapshots; a schema migration requires a separate compatibility/backup assessment.

Finalized reads use their snapshot even after settings changes. Legacy snapshots with unknown provenance retain recorded values and return `legacy_unknown`; they are not silently backfilled with current settings. Reopen is admin-authorized, reason >=10 trimmed characters, audited and revision-preserving; verify compatibility with existing API validation in TPR-01.

## 4. R2/R4: Comparable Trends

Proposed additive metric envelope (names finalized in TPR-01):

```ts
type ComparableMetric = {
  value: number | null;
  metric: 'monthly_score' | 'skill_raw' | 'performance_score';
  source: 'manual_monthly' | 'daily_raw' | 'operational_proxy' | 'missing' | 'legacy_unknown';
  formula_version: string | null;
  settings_version: string | null;
  skill_keys: string[];
  evidence_count: number;
  assessed_date_count: number;
  comparison: {
    delta: number | null;
    baseline_period: { from: string; to: string } | null;
    comparable: boolean;
    reason: string | null;
  };
};
```

This is a contract sketch, not a shipped DTO. Preserve existing response keys while adapting all consumers; do not turn `null` into zero in frontend formatting, sorting, export or PDF.

Monthly comparisons use the previous calendar month for the same tenant/student/class and same metric/source/formula/contributing skill set. The comparison signature also includes normalization and effective contributor weights: a changed proportion of Listening versus Speaking entries must not create an apparent improvement even when both skills occur in both months. Either the approved resolver uses stable per-skill weights or the changed composition is non-comparable. Load that baseline even when it lies just outside the user's filter. Missing previous calendar month is not replaced by a more distant month. Compare raw values before display rounding.

Raw academic comparisons additionally require a comparable track/exam calibration signature. Performance comparisons also require identical effective weighting/cap settings. Unrelated setting changes need not invalidate comparability; compare the relevant signature, not only global configVersion.

- Academic 60 -> 80, same contributors/rubric, attendance 100 both months: delta +20, improving.
- Proxy 100 -> academic 80: delta null, reason `source_changed`, not declining.
- Listening 90 then Speaking 50, one observation each: each trend and overall trend null, reason `insufficient_comparable_evidence`.
- Two assessed dates for the same skill: latest date's skill mean minus earliest comparable date's skill mean. Same-date entries do not create a longitudinal trend.
- Overall day/window trend requires identical assessed skill sets and calibration/source signatures. No imputing unobserved skills as zero; otherwise return null with coverage.

Alerts use one shared comparator: full-calendar-month views compare the immediately preceding calendar month; custom windows compare the preceding equal-length inclusive-date window. Endpoints with identical windows must return identical values, baselines and alert reasons. Always expose baseline kind so different windows are not presented as the same alert.

Score-drop threshold is current < 0.85 * baseline for comparable metrics. Exact 15% drop does not trigger this strict rule. Baseline zero or missing gives no ratio-based alert. Cumulative practice totals may increase with volume; never label their change as skill improvement.

## 5. R5: Settings, Timeline And PDF

Resolve settings by tenant and each entry's effective month before aggregation. A range crossing a config or track change cannot apply its last month's weight to every entry. Finalized months use frozen snapshots; open months use their effective config revision.

Default rank progression remains starters=1, movers=2, flyers=3, ket=4, pet=5; default delta 0.15 and weight clamp 0.7..1.3, subject to approved effective settings. Do not reinterpret easy/medium/hard as Cambridge levels.

Raw 80, Flyers set in Movers class, configured delta 0.30 -> weight 1.30 -> performance min(100,104)=100. Default delta 0.15 -> 92. Raw remains 80 in both cases.

Invalid explicit configuration is a typed error, not an invisible default. Absent settings use documented defaults only where contract permits; legacy unknown snapshots remain unknown. Cache keys include tenant, relevant period/input revision and config revision. Settings changes cannot leak across tenants.

Detail, list, CSV/print and PDF must use the same resolver for the same scope. Multi-period charts may show individually adjusted points but must suppress an aggregate trend when calibration is non-comparable. Display source, coverage and unavailable trend honestly; no new feature-explanation panels are required.
