---
name: project-structure
description: "Directory layout, module boundaries, naming conventions"
version: "4.0"
enforcement: mandatory
human_override: "User can override with explicit justification documented in decisionLog.md"
---

# Rule: Project Structure

## R1: Standard Directories

```
src/
├── app/          → Next.js App Router pages (or pages/ for Pages Router)
├── components/   → Reusable UI components
│   ├── ui/       → Design system primitives (Button, Input, Card)
│   └── features/ → Feature-specific components (UserProfile, OrderList)
├── services/     → Business logic (UserService, PaymentService)
├── repositories/ → Data access layer (UserRepository)
├── middleware/    → Express/Next.js middleware (auth, validation, logging)
├── utils/        → Pure utility functions (formatDate, generateId)
├── types/        → TypeScript interfaces and type definitions
├── config/       → Configuration loading and validation
├── constants/    → Application-wide constants
└── lib/          → Third-party library wrappers
```

## R2: Module Boundaries

- **Components**: UI only, no API calls (receive props, emit events)
- **Services**: Business logic, does not know about HTTP or database drivers
- **Repositories**: Data access only, returns domain objects (not raw DB rows)
- **Middleware**: Cross-cutting concerns (auth, logging, rate limiting)
- **Utils**: Pure functions, no side effects, no dependencies on services

## R3: File Organization

- One component/class/module per file
- Co-locate: component + test + styles in same directory
- Index files: only for public API re-exports (barrel pattern)
- Shared types: `types/` directory at project root

```
components/UserProfile/
├── UserProfile.tsx        → Component
├── UserProfile.test.tsx   → Tests
├── UserProfile.module.css → Styles
└── index.ts               → Re-export
```

## R4: Import Rules

- No circular imports (enforce with ESLint)
- Absolute imports with path alias (`@/` for src)
- Layer dependencies: components → services → repositories (not backwards)
- No importing from `node_modules` internals

## Verification

- Automated: circular import detection (ESLint), directory structure linter
- Review: judge-agent checks structure on PRs with new files

## Related

- Agent: `agents/explorer-agent.md` (discovers existing structure)
- Agent: `agents/code-archaeologist.md` (refactors structure)