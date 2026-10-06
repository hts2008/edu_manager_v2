# Production Operations - 2026-10-06

Canonical: https://edu-manager-gules.vercel.app. Vercel project edu-manager in hts2008s-projects. GitHub PR https://github.com/hts2008/edu_manager_v2/pull/2.

## Operator Access

Center code `default`, username `admin-live`, tenant admin only. Password is in the local EFS/ACL protected `.release-private/production-admin.json`; never copy it into Git, docs, logs or cloud deployment. Existing accounts retained. Require center code on login; preserve enforced tenancy, existing secret configuration and Vercel deployment protection.

## Recovery

Final frozen physical encrypted backup `production-1791280231672.dump.enc.json` and recovery key are private. Full inventory/checksums and isolated PG17 writable recovery verified. Cloud V4 encrypted upload and verification/counts passed against canonical. Retain both recovery paths. Restore is an authorized maintenance operation, never an ordinary smoke test.

Do not roll back by aliasing the old unscoped application onto the contracted schema. Put canonical into retained compatible maintenance deployment `dpl_Ekx7L9XCgmfNRwKAyDdfY3eZoJMZ`, then use validated database recovery plus compatible app. Verify exact database target, original data and ownership before restoring traffic. Release freeze protects ordinary writers, not a malicious provider owner with ADMIN OPTION. Manual CLI lock recovery requires independently confirmed process exit and explicit uniquely marked backend evidence; idle alone is insufficient.

## Verification

`RELEASE_CONFIRMATION=EDU_MANAGER_PRODUCTION_20261006` with `npx tsx scripts/release-production-smoke.ts` checks exact production identity, original credentials, temporary-role cleanup, login/negative login/platform denial, seven APIs and encrypted V4 cloud backup. This intentionally creates a backup; do not run in tight loops. Private proof `.release-private/production-smoke.json`; sanitized evidence in [release receipt](../../../receipts/2026-10-06-go-live-execution.md).

Observe auth failures, API5xx, fee/progress saves, backup cron success and actual printer output during the first24h. This future observation is not certified by a one-time smoke. Historical unknown provenance requires owner-provided evidence before any financial/academic recalculation. Do not add demo data to production or overwrite customized print defaults.
