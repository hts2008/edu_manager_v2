# CODEX.md - EDU_MANAGER_V2 Codex Runtime Briefing

This file is the compact Codex-specific briefing for the EDU_MANAGER_V2
workspace. Use `AGENTS.md` for the full cross-tool operating doctrine.

## Project Truth

- Product: EDU_MANAGER_V2, a Vietnamese education-center operations platform.
- Canonical workspace: `C:\Users\haitr\OneDrive\0. GAU DATA\0.APP\EDU_MANAGER_V2`.
- Production URL: `https://edu-manager-gules.vercel.app`.
- Production backend truth: `api/router.ts` dispatching to `server/api/*`.
- Reference backend: `backend/` Express + SQLite, retained only for local/reference parity.
- Frontend: Vite + React 19 + Tailwind CSS v4.
- Database/storage: Neon Postgres + Vercel Blob.
- ORM: Prisma 5, generated before frontend build.
- API boundary: `{ success, data|error }` envelope and snake_case frontend fields.

## Required Start Context

Read these before non-trivial work:

1. `KANBAN.md`
2. `memory/memory-bank/activeContext.md`
3. `memory/memory-bank/progress.md`
4. `memory/memory-bank/decisionLog.md`
5. `memory/sessions/current-session.md`
6. `PLAN.md` or the active plan under `plans/`

## Active Operating Rules

- Keep EDU_MANAGER_V2 isolated from external workspace paths or project names.
- Separate framework/memory drift from product code commits.
- Do not deploy, migrate, seed, or mutate production data without explicit approval
  for that specific operation.
- Keep live SMS/Zalo sending disabled unless provider, opt-in policy, message
  templates, and `REMINDER_SEND_ENABLED=true` are intentionally configured.
- Prefer Vercel + Prisma production handlers over Express for new runtime truth.
- Preserve Unicode-safe PDF generation and PDF smoke coverage.

## Verification Defaults

Use the bundled Node runtime when PowerShell or system Node blocks execution:

```powershell
$env:Path='C:\Users\haitr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
cmd /c npm run test:unit
cmd /c npx tsc --noEmit
cmd /c "cd frontend && npm run lint -- --max-warnings=0"
cmd /c npm run build
```

If a gate fails due to sandbox or network restrictions, record it as an
environment blocker and rerun with approval only when the gate is required for
the current task.
