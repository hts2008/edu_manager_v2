# GitHub Source Synchronization

Task SYNC-RECEIPT-DESIGNER-20261007. User authorized syncing deployed code to https://github.com/hts2008/edu_manager_v2.

Scope: editable receipt composer, PDF parity and tests, test-only CRLF repair, safe deployment exclusions, verification scripts and related evidence. Includes previously local-only authorized reset tooling commit2cccc3a; uploading its source does not execute a reset.

Branch codex/receipt-designer-production-20261007, based on current origin/main2bb02c4. Feature commit4200b2a; CRLF regression5d9bac4; deployment exclusions8e85294. Commit source matches the application previously deployed as dpl_8mhZaNdUxHEJJ5YBRmTZ4UH4zGch.

Private credentials/.env/backups/logs excluded. Unrelated historical untracked artifact folders preserved locally and not staged. No force push, dependency upgrade, database mutation or credential change.

Pre-push evidence: staged diff check pass; high-risk token/private-key pattern scan zero matches and private staged files zero. Previous release root540/frontend258/PDF-API16, lint/typecheck/build pass; PR CI and remote/main verification required before declaring synchronization complete.

Workflow: publish scoped branch, attach PR, require passing repository CI, merge non-destructively and verify main source. Existing live release receipt contains rollback notes. NM/C+ unavailable,0/0calls, health unavailable; workspace markdown mode.
