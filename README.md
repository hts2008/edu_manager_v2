# EDU MANAGER V2

Production education-center operations platform for students, classes, attendance, tuition collection, receipts and expenses, print templates, analytics, and student progress.

Production: https://edu-manager-gules.vercel.app

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, React Router 7, Vite 7, Tailwind CSS v4 |
| API | Vercel Node.js serverless TypeScript handlers |
| Database | Neon PostgreSQL with Prisma 5 |
| Auth | Stateful JWT and role-based access control |
| Documents | pdfmake and Fabric.js template editor |

`api/router.ts`, `server/api/`, and `prisma/schema.prisma` are the production sources of truth. `backend/` is reference-only and is not part of the production request path.

## Local Setup

Prerequisites: Node.js 20 or newer and access to a PostgreSQL database.

```powershell
npm install
npm --prefix frontend install
```

Create an untracked local environment file or set environment variables in the shell. At minimum, serverless development requires `DATABASE_URL`, `DIRECT_URL`, and `JWT_SECRET`. Never commit credentials or database URLs.

Run the full Vercel development environment:

```powershell
npm run dev:vercel
```

Run the frontend-only Vite server when API access is provided separately:

```powershell
npm run dev
```

The Vercel development server listens on `http://localhost:3000` by default.

## Quality Gates

```powershell
npx prisma validate
npx tsc --noEmit
npm --prefix frontend run lint -- --max-warnings=0
npm run test:unit
npm run build
```

Real database integration tests require an isolated `TEST_DATABASE_URL`:

```powershell
npm run test:integration:real
```

## Database Operations

```powershell
npm run db:backup
npm run db:migrate
npm run db:seed
npm run db:studio
```

Run migrations or seed operations only against an explicitly selected environment and only after a verified backup. `prisma/schema.prisma` is the schema source of truth.

## Operational Scripts

Performance, parity, and UX scripts require credentials through environment variables. They do not contain default accounts and do not accept passwords via command-line arguments.

Examples of required variable pairs:

- Parity: `PARITY_USERNAME`, `PARITY_PASSWORD`
- Performance smoke: `PERF_USERNAME`, `PERF_PASSWORD`
- Performance lab: `PERF_LAB_USERNAME`, `PERF_LAB_PASSWORD`
- UX baseline: `UX_USERNAME`, `UX_PASSWORD`

Use a secure secret manager or process-scoped shell variables. Do not place credential values in documentation, committed files, command history, or test artifacts.

## Key Paths

```text
api/                 Vercel entrypoint
server/api/          Production route handlers
lib/                 Shared backend services
prisma/              Schema, migrations, and seed tools
frontend/src/        React application
tests/               Backend/unit/integration contracts
frontend/tests/      Frontend and browser tests
docs/                API and operational documentation
```

API documentation is maintained in `docs/API.md` and is checked against `api/router.ts` by automated tests.
