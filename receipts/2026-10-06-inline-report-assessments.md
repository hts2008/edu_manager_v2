# Inline Report Assessments Receipt

Task UX-PROGRESS-INLINE-01: IMPLEMENTED locally, 2026-10-06. User-authorized inline scoring in report rows, server date and update count. No production-readiness or deployment claim.

## Changes

- Report default; Overview secondary; no standalone Update tab or grading date picker. Core score inputs always visible in eligible rows; optional homework/practice/mock test/context/note.
- Server appends each independent submission with business date Asia/Ho_Chi_Minh. Multiple skills count once; same-day submissions remain separate. Legacy evidence count is not retroactively called submissions.
- Tenant/grade/view/enrollment/assigned grader/finalization/CAS guards retained. Atomic evidence, canonical rollup and replay receipt. Same UUID replay never double counts, including across rollover/finalization. Known compound month-creation races use bounded whole-transaction retry; unrelated unique constraints are not masked.
- Canonical report refresh preserves other-row drafts; uncertain outcomes keep immutable retry identity. Previous-month comparison data no longer leaks into current report rows.

## Evidence

[Review package](../docs/artifacts/inline-report-assessments-2026-10-06/README.md): frontend216/216; root536/536; dedicated contracts/report18/18; real local PostgreSQL/HTTP19/19 in three consecutive rounds; lint, typecheck, enforced-tenancy build pass. Independent read-only reviewer29backend/22frontend tests pass and findings closed.

Browser performed two submissions without attendance: listening0; then reading100/homework80. Report live60/100,2 updates,3 skill evidence; persisted after reload and final backend restart. Final desktop screenshot confirms empty inputs ready for a new assessment and one current-month row. Mobile effective CSS434px, document434px, no document overflow/date input; viewport reset.

## Scope And Limits

Current review URL http://127.0.0.1:3090/student-progress, serverPID61916. Existing3088 left untouched, cached older backend. Browser fixture retained only in isolated local test tenant. Multi-row draft preservation covered by mounted mocked-API tests, not live multi-row browser trial. Mobile screenshot captures filters, not grading row. Transient old lazy-bundle fetch after rebuild resolved on reload; not claimed as a clean all-session console log.

No schema, dependency, migration, production access, commit, push or deployment. Prior production NO-GO/security/history/recovery/sign-off and approval-bearing gates unchanged. NM/C+ unavailable, calls0/0, health unavailable; workspace markdown/ADR-65 only.
