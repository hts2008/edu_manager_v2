# Audit V2 Production Evidence Summary

- Deployment: `dpl_8LSoPr4QHvJWcTNXNnxFb9LhJRZf`
- Canonical URL: `https://edu-manager-gules.vercel.app`
- Code: `39e4fb6`, `4834e3f`, `c244e8e`
- Database: 7 migrations, production status clean
- Backup: AES-GCM v3, 28 tables, uploaded and verified valid
- Automated tests: root 496/496, frontend 42/42
- Chrome regression: 44/44 scenarios across 22 routes at desktop/mobile
- Current-deployment Chrome smoke: 8/8 scenarios across 4 critical routes at desktop/mobile
- Browser findings: 0 horizontal document overflow, 0 API errors, 0 console errors, 0 page errors
- Current deployment evidence: `docs/artifacts/audit-v2-2026-08-03/final-chrome-smoke/2026-08-03T09-12-33-271Z/`
- Full receipt: `receipts/2026-08-03-audit-v2-remediation-closeout.md`
