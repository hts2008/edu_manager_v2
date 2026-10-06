# Production Go-Live Preflight

User authorized GitHub synchronization, Vercel production deployment and operational tenant/admin creation. Scope discovery still required: 373 changed/untracked paths include unfinished Admin Console migrations and a local SQLite shared-memory file, so bulk staging is unsafe.

Verified target: origin https://github.com/hts2008/edu_manager_v2.git; current branch main; fetch succeeded; HEAD...origin/main 0/0. Local Vercel link edu-manager project prj_hF5K6Pb2LSSX5YbXCKtmLDH6RkRh. No remote write/deployment performed.

Fresh checks: npx tsc --noEmit pass. npm audit --omit=dev fails: undici high. npm run audit:frontend-policy fails: unwaived brace-expansion high. Existing CI requires both audits, hence candidate cannot pass current release policy. Production-readiness G09 dataful migration and G10 recovery evidence remain unclosed; do not infer success from local isolated fixtures.

Pending user inputs: all-local versus scoped release; permission for necessary security dependency updates; center name/slug; new empty tenant versus existing production data. Suggested edu-main/admin are proposals, not created accounts. No password generated or committed. No .env values disclosed.

Status NO-GO pending remediation and target-safe rehearsal. Existing deployment and local work preserved. NM/C+ unavailable, markdown-only mode.
