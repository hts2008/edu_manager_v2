# 📦 NEXT.JS + TYPESCRIPT STACK
<!-- VI: Stack tham chiếu cho Next.js + TypeScript + Prisma -->

> **Best for**: Full-stack applications, SSR/SSG, production-ready apps
> **Level**: Recommended Primary Stack

---

## 🏗️ ARCHITECTURE

```
┌─────────────────────────────────────────┐
│              Next.js 15                  │
│     (React 19 + Server Components)       │
├─────────────────────────────────────────┤
│    API Routes      │    Server Actions   │
├─────────────────────────────────────────┤
│              Prisma ORM                  │
├─────────────────────────────────────────┤
│           PostgreSQL 16                  │
└─────────────────────────────────────────┘
```

---

## 📁 PROJECT STRUCTURE

```
src/
├── app/                    # App Router
│   ├── (auth)/            # Route groups
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── api/               # API routes
│   │   └── [...route]/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                # Base UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── index.ts
│   ├── forms/             # Form components
│   └── layouts/           # Layout components
├── lib/
│   ├── prisma.ts          # Prisma client
│   ├── auth.ts            # Auth configuration
│   └── utils.ts           # Utility functions
├── hooks/                 # Custom React hooks
├── stores/                # State management (Zustand)
├── types/                 # TypeScript types
├── actions/               # Server actions
└── services/              # Business logic
```

---

## ⚙️ CONFIGURATION FILES

### package.json (core dependencies)
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@prisma/client": "^5.0.0",
    "zod": "^3.23.0",
    "zustand": "^5.0.0",
    "next-auth": "^5.0.0",
    "@tanstack/react-query": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "@types/node": "^22.0.0",
    "prisma": "^5.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 🔧 KEY PATTERNS

### Prisma Client Singleton
```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

### Server Action Pattern
```typescript
// src/actions/user.actions.ts
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

export async function createUser(formData: FormData) {
  const data = createUserSchema.parse({
    email: formData.get('email'),
    name: formData.get('name'),
  });

  const user = await prisma.user.create({ data });
  revalidatePath('/users');
  return user;
}
```

### Zustand Store Pattern
```typescript
// src/stores/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    { name: 'auth-storage' }
  )
);
```

---

## 📋 TECH CHOICES

| Category | Choice | Reason |
|----------|--------|--------|
| Framework | Next.js 15 | Server components, best DX |
| Language | TypeScript | Type safety |
| Database | PostgreSQL | Feature-rich, reliable |
| ORM | Prisma | Type-safe, great DX |
| Styling | Tailwind CSS 4 | Rapid development |
| State | Zustand | Simple, lightweight |
| Server State | TanStack Query | Caching, revalidation |
| Validation | Zod | Type-safe schemas |
| Auth | NextAuth.js 5 | Built for Next.js |
| Testing | Vitest + Playwright | Fast, modern |

---

## 🚀 SCRIPTS

```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:migrate": "prisma migrate dev",
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

---

**Reference for**: Fullstack, Backend, Frontend Agents
