# Local Review Dataset

- User requested synthetic review data. Seeded only guarded loopback tpr_test_20261005 database/schema in the existing browser fixture tenant. Passwords/auth/config unchanged; no production access.
- Namespace local-review-v1; names marked [DEMO]. Dataset: 6 students, 6 parents, 1 teacher, 3 per-session classes, 24 progress months (July-October2026), 320 dated skill assessments, 108 class sessions and 216 attendance rows.
- Scenarios: improving55->85, stable76->79, declining85->48, breakthrough40->90, no academic evidence, valid zero. Missing evidence can display an operational proxy, not a fabricated academic score. Current-month future dates are synthetic fixtures, not actual delivered lessons.
- Real monthly-fees/generate API returned200 for each month: 6 created and 1 existing unrelated fixture skipped per month, 24 new fee records total. Eight regular sessions and one surcharge extra session per class; absence-without-fee scenario included. No fabricated paid status/receipts.
- Authenticated students/classes/monthly-fees/progress-report/activity-logs reads returned200. Typecheck passed. Second seed run retained the same6 students/3 classes/24 months without overwrite.
- Script scripts/local-review-data.ts requires LOCAL_REVIEW_CONFIRM=local-review-v1, exact browser ownership and guarded target/live database identity. Entire seed transaction rolls back on failure. Existing review changes are not overwritten. No deletion/cleanup action provided; retain history and use disposable database lifecycle for disposal.
- Newly observed defect: monthly-fees/calculate returns500 UNSAFE_RAW_QUERY on tenant-scoped advisory lock. Generator succeeds, but this manual calculation path remains a production blocker; tracked separately, not hidden with seeded totals.
- NM/C+ unavailable, calls0/0, health unavailable. Production NO-GO unchanged.
