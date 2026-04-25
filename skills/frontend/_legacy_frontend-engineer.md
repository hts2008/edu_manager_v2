---
name: frontend-engineer
description: "React/Next.js patterns, state management, component architecture"
---

# Frontend Engineering Skill

## Quick Reference

### Component Pattern
```tsx
interface UserCardProps {
  user: User;
  onEdit: (id: string) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <article data-testid={`user-card-${user.id}`}>
      <h3>{user.name}</h3>
      <button onClick={() => onEdit(user.id)}>Edit</button>
    </article>
  );
}
```

### State Management Decision
| State Type | Solution |
|-----------|----------|
| Component-local | useState |
| Shared between siblings | Lift state up |
| Deep prop drilling | Context (for low-frequency updates) |
| Complex app state | Zustand / Redux Toolkit |
| Server data cache | TanStack Query / SWR |
| URL state | URL params / searchParams |
| Form state | react-hook-form / Formik |

### Component States (all must be handled)
```
LOADING → Show skeleton or spinner
ERROR   → Show error message + retry button
EMPTY   → Show empty state illustration + CTA
SUCCESS → Show data
```

## Sub-Skills
- `react-patterns.md` — Hooks, composition, render patterns
- `nextjs-app-router.md` — Server/client components, layouts, loading
- `state-management.md` — Context, Zustand, TanStack Query
- `forms.md` — Validation, error display, multi-step forms