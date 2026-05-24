# Learned Patterns

## PAT-001: Snake-Sync Contract

Prisma/server code uses camelCase while the frontend expects snake_case in many
legacy contracts. Always verify DTO mapping before declaring a page real.

## PAT-002: One Router For Vercel API Scale

Production routes dispatch through `api/router.ts` into `server/api/*` to avoid
Vercel Hobby function-count limits. Avoid reintroducing many top-level API
functions.

## PAT-003: PDF Unicode Is A Release Gate

Vietnamese receipt/payment PDFs must include embedded Unicode font maps. Smoke
for `%PDF`, `application/pdf`, `/ToUnicode`, and Roboto before claiming print
readiness.

## PAT-004: Operations UI Beats Marketing UI

This product is used repeatedly by staff. Prefer dense tables, clear status
chips, short workflows, and stable layout over hero-style decoration.

## PAT-005: Separate Drift From Product Work

Framework/memory/doctrine drift must not be committed together with app feature
changes. Classify dirty state before implementation.

## PAT-006: Tuition Logic Must Be A Shared Engine

Attendance fee calculation, monthly-fee generation, period lock refresh, receipt
creation, and reports must call one shared tuition engine. Duplicating calendar
or weekday logic creates silent finance drift, especially for classes configured
as monthly tuition plus `sessions_per_week`.
