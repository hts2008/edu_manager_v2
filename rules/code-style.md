---
name: code-style
description: "Naming, formatting, file structure, TypeScript conventions"
version: "4.0"
enforcement: mandatory
human_override: "User can override with explicit justification documented in decisionLog.md"
---

# Rule: Code Style

## R1: Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Variables, functions | camelCase | `getUserById`, `isActive` |
| Classes, components, types | PascalCase | `UserService`, `PaymentForm` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| Files (components) | PascalCase | `UserProfile.tsx` |
| Files (utilities) | camelCase or kebab-case | `formatDate.ts`, `string-utils.ts` |
| Directories | kebab-case | `user-profile/`, `api-handlers/` |
| Database tables | snake_case, plural | `order_items`, `user_roles` |
| CSS classes | kebab-case | `nav-header`, `btn-primary` |
| Environment variables | UPPER_SNAKE_CASE | `DATABASE_URL`, `API_KEY` |

## R2: File Size Limits

- **Max 300 lines per file** — extract when exceeding
- **Max 50 lines per function** — extract helper functions
- **Max 5 parameters per function** — use parameter object
- **Max 3 levels of nesting** — extract early returns or helper functions
- **Max 1 class per file** — each class gets its own file

## R3: TypeScript Conventions

- Use `interface` for object shapes, `type` for unions/intersections
- Favor `const` over `let`, never use `var`
- Use `readonly` for properties that shouldn't change
- Explicit return types on exported functions
- No `any` — use `unknown` if type is truly unknown
- Use discriminated unions for state: `{ status: 'loading' } | { status: 'success', data: T } | { status: 'error', error: Error }`

## R4: Import Order

```typescript
// 1. Node built-ins
import path from 'path';

// 2. External packages
import express from 'express';
import { z } from 'zod';

// 3. Internal modules (absolute paths)
import { UserService } from '@/services/UserService';

// 4. Relative imports
import { formatDate } from './utils';

// 5. Type imports (last)
import type { User } from '@/types';
```

## R5: Comments

- Code should be self-documenting — prefer clear names over comments
- Comment WHY, not WHAT (the code shows what, comments explain why)
- JSDoc on all exported functions: `@param`, `@returns`, `@throws`
- TODO format: `// TODO(author): description (#issue-number)`
- No commented-out code in commits — delete it (git has history)

## Verification

- Automated: ESLint + Prettier in CI (format on save, lint on commit)
- Pre-commit hook: format + lint
- Review: judge-agent checks naming and file size

## Related

- Agent: `agents/judge-agent.md` (reviews for style)
- Quality gate: lint gate in `manifests/quality-gates.yaml`