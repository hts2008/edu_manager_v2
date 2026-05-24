# Operational Hygiene Closeout - 2026-05-24

## Scope
- Continue from the latest production deploy/env closeout.
- Close the stale unchecked `current-session.md` item about isolating/committing operational hygiene drift.
- Keep product/app changes separate from doctrine/memory/evidence drift.

## Agent Coordination
- Used Codex `multi_agent_v1` sidecar agents as the available fallback for `ck:team`.
- Explorer 1 classified dirty/untracked files into app/product, generated/temp, risky local config, and docs/memory buckets.
- Explorer 2 audited `frontend/update*`, `.vercelignore`, evidence folders, and memory scaffolding.
- Worker confirmed the real next unchecked item was post-deploy dirty-tree hygiene, not deferred native `.xlsx` parsing.

## Findings
- App/product changes are intentional production hardening and should be kept as a dedicated batch.
- `.vercelignore`, `docs/audit`, `plans`, `receipts`, and memory scaffolding are intentional evidence/source-of-truth artifacts.
- `frontend/update*.cjs`, `frontend/update*.js`, and `frontend/update*.ps1` were one-off rewrite scripts with no references.
- `.codex/config.toml` local permission drift is not app behavior and must not be committed.

## Cleanup Applied
- Removed 9 untracked one-off `frontend/update*` scripts after `rg` found no references and resolved paths were verified inside the workspace.
- Restored `.codex/config.toml` to tracked safe policy; no `approval_policy=never` or `sandbox_mode=danger-full-access` diff remains.
- Added `.gitignore` coverage for:
  - `frontend/output/`
  - `frontend/update*.cjs`
  - `frontend/update*.js`
  - `frontend/update*.ps1`
  - `.codex/*.bak`
- Updated `CODEX.md` canonical production URL to `https://edu-manager-gules.vercel.app`.
- Updated `KANBAN.md`, `activeContext.md`, `progress.md`, `current-session.md`, and `handoff.md`.

## Commit Hygiene Decision
- If committing, use explicit batches only:
  - App/product source, tests, and deploy config.
  - Docs, memory, receipts, plans, and doctrine.
- Do not run broad `git add .`.
- Do not stage `.codex/config.toml`.
- Do not delete `frontend/output/` until referenced screenshots are archived or receipt links are updated.

## Verification
- `git status --short --branch` confirmed branch `codex/edu-production-readiness`.
- `git diff -- .codex/config.toml` is clean after restore.
- `Get-ChildItem frontend -Filter update*` returned no files after cleanup.
- `git diff --check` passed.
- `npx tsc --noEmit` passed.
- `npm run test:unit` passed 28/28.
- `npm --prefix frontend run lint` passed.
- `npm run build` passed; Vite reported only existing dynamic-import/chunk-size warnings.
- `npm audit --audit-level=high` passed.
- `npm --prefix frontend audit --audit-level=high` passed.
- Production Playwright smoke passed 6/6 against `https://edu-manager-gules.vercel.app`.

## Remaining Follow-Up
- Rotate default production credentials and JWT secret before real operation.
- Define financial correction policy for historical paid records with `days_count=0` and non-zero amount.
- Keep SMS/Zalo live send disabled until provider, opt-in policy, and approved templates are ready.
