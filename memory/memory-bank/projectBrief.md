# Project Brief

**Name**: EDU_MANAGER_V2

**Product**: Vietnamese education-center operations platform for students,
parents, teachers, classes, attendance, monthly fees, receipts, payments,
templates, reports, admin settings, backups, recycle bin, and parent portal.

**Current production stack**:
- Frontend: Vite + React 19 + Tailwind CSS v4.
- Production API: Vercel router `api/router.ts` dispatching to `server/api/*`.
- Data: Prisma 5 on Neon Postgres.
- Files/storage: Vercel Blob for template images and encrypted backups.
- Reference only: Express + SQLite under `backend/`.

**Goals**:
- Keep production workflows end-to-end, not shell-only.
- Preserve attendance-to-fee-to-receipt financial linkage.
- Preserve Unicode-safe receipt/payment PDF output.
- Make the interface production-ready for daily staff operation.
- Keep KANBAN, memory, and receipts synchronized with evidence.

**Current master goal**:
Complete `PLAN.md`: drift cleanup, reality audit, Stitch/Figma-backed UX
source of truth, production UI implementation, dataflow gap closure, and full
verification/write-back.
