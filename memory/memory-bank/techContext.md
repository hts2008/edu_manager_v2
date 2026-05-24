# Tech Context

## Runtime

- Node.js >= 20. Use the bundled Codex Node runtime if system Node or
  PowerShell policy blocks local gates.
- Package manager: npm with `package-lock.json`.
- Module system: ESM.

## Frontend

- Vite + React 19.
- React Router 7.
- Tailwind CSS v4 via `@tailwindcss/vite`.
- JavaScript/JSX pages and components.
- Primary routes are declared in `frontend/src/App.jsx`.
- API client lives in `frontend/src/services/api.js`.

## Backend

- Production path: Vercel Serverless router `api/router.ts`.
- Handlers live under `server/api/*`.
- Shared utilities live under `lib/*`.
- Express + SQLite under `backend/` is reference/local only.

## Data

- Prisma 5 is the ORM and `prisma/schema.prisma` is schema truth.
- Production database is Neon Postgres.
- Vercel Blob stores template images and encrypted backups.
- API boundary preserves `{ success, data|error }` and snake_case fields for
  the existing frontend.

## Verification

Preferred local gates:

```powershell
$env:Path='C:\Users\haitr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:Path
cmd /c npm run test:unit
cmd /c npx tsc --noEmit
cmd /c "cd frontend && npm run lint -- --max-warnings=0"
cmd /c npm run build
```

Network-dependent audit commands may need approval because the Codex sandbox can
block registry access and npm cache writes outside the workspace.
