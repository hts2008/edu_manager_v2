# GitHub Source Synchronization

Task SYNC-RECEIPT-DESIGNER-20261007. User authorized syncing deployed code to https://github.com/hts2008/edu_manager_v2.

## Verified Closeout

IMPLEMENTED: https://github.com/hts2008/edu_manager_v2/pull/3 merged at2026-10-06T17:29:52Z (2026-10-07 local), merge commit0ed0489e18aa879fa9fdbd13d1c9fa73b161e9e4. Local main fast-forwarded to verified remote main; no reset or force push.

PR CI run37503712484 passed verify/integration/visual-e2e/real-e2e. Independent pre-push review found no blockers:48 focused tests passed; exact private credential-value scan across53 candidate files zero matches. Repository source and related designer evidence published; unrelated historical untracked artifact folders retained locally.

GitHub's automatic Vercel check reports a different team scope (hts2008s-projects-2164604d), inaccessible to current deployment credentials. It is not used as evidence for the intended production project. Canonical production remains the explicitly verified release dpl_8mhZaNdUxHEJJ5YBRmTZ4UH4zGch in team_H6h8rGojdSrgQYHe9kGgqvgh; this sync does not change integration settings or credentials.

The following planning details describe the pre-push checkpoint; CI/merge requirements above are satisfied. Post-merge main CI is a separate regression run, not evidence of a different application deployment.

Scope: editable receipt composer, PDF parity and tests, test-only CRLF repair, safe deployment exclusions, verification scripts and related evidence. Includes previously local-only authorized reset tooling commit2cccc3a; uploading its source does not execute a reset.

Branch codex/receipt-designer-production-20261007, based on current origin/main2bb02c4. Feature commit4200b2a; CRLF regression5d9bac4; deployment exclusions8e85294. Commit source matches the application previously deployed as dpl_8mhZaNdUxHEJJ5YBRmTZ4UH4zGch.

Private credentials/.env/backups/logs excluded. Unrelated historical untracked artifact folders preserved locally and not staged. No force push, dependency upgrade, database mutation or credential change.

Pre-push evidence: staged diff check pass; high-risk token/private-key pattern scan zero matches and private staged files zero. Previous release root540/frontend258/PDF-API16, lint/typecheck/build pass; PR CI and remote/main verification required before declaring synchronization complete.

Workflow: publish scoped branch, attach PR, require passing repository CI, merge non-destructively and verify main source. Existing live release receipt contains rollback notes. NM/C+ unavailable,0/0calls, health unavailable; workspace markdown mode.
