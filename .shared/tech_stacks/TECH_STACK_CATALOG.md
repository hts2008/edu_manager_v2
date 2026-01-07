# 📚 TECH STACK CATALOG
<!-- VI: Danh mục công nghệ tham chiếu. Agent phải tham khảo file này khi đưa ra quyết định công nghệ -->

> **PURPOSE**: Reference catalog for technology selection decisions.
> Agents must consult this file before making technology choices.

---

## 📊 QUICK REFERENCE

| Category | Recommended | Alternatives |
|----------|-------------|--------------|
| **Frontend Framework** | Next.js 15 | React 19, Vue 3, Svelte 5, Angular 18 |
| **Backend Runtime** | Node.js 22 | Python 3.12, Go 1.22, .NET 8 |
| **Backend Framework** | Express/Fastify | NestJS, Hono, Koa |
| **Database (SQL)** | PostgreSQL 16 | MySQL 8, SQL Server, SQLite |
| **Database (NoSQL)** | MongoDB 7 | Redis, DynamoDB |
| **ORM** | Prisma | Drizzle, TypeORM, Sequelize |
| **CSS Framework** | Tailwind CSS 4 | CSS Modules, styled-components |
| **State Management** | Zustand | Redux Toolkit, Jotai, Pinia |
| **Testing** | Vitest + Playwright | Jest, Cypress |
| **CI/CD** | GitHub Actions | GitLab CI, Jenkins |
| **Cloud** | Vercel/AWS | GCP, Azure, Railway |

---

## 🖥️ FRONTEND TECHNOLOGIES

### Frameworks

| Technology | Best For | Pros | Cons | Community |
|------------|----------|------|------|-----------|
| **Next.js 15** | Full-stack apps, SSR/SSG | Server components, great DX, Vercel integration | Learning curve, Vercel-centric | ⭐⭐⭐⭐⭐ |
| **React 19** | SPAs, component libs | Massive ecosystem, job market | Need meta-framework for routing | ⭐⭐⭐⭐⭐ |
| **Vue 3** | Progressive apps | Gentle learning curve, great docs | Smaller ecosystem than React | ⭐⭐⭐⭐ |
| **Svelte 5** | Performance-critical | Smallest bundle, fast | Smaller ecosystem, less jobs | ⭐⭐⭐ |
| **Angular 18** | Enterprise apps | Full framework, TypeScript first | Heavy, steep learning curve | ⭐⭐⭐⭐ |

### CSS & Styling

| Technology | Best For | Pros | Cons |
|------------|----------|------|------|
| **Tailwind CSS 4** | Rapid development | Utility-first, consistent, small bundle | HTML can be verbose |
| **CSS Modules** | Component isolation | Native CSS, no runtime | Manual naming, limited utilities |
| **styled-components** | Dynamic styling | CSS-in-JS, theming | Runtime overhead, bundle size |
| **Emotion** | Performance CSS-in-JS | Flexible, performant | Similar to styled-components |
| **Sass/SCSS** | Complex stylesheets | Variables, nesting, mixins | Build step required |
| **Vanilla CSS** | Simple projects | No dependencies, native | Manual organization |
| **UnoCSS** | Atomic CSS | Faster than Tailwind, customizable | Less mature |
| **Panda CSS** | Type-safe styling | Build-time CSS-in-JS, zero runtime | Newer, learning curve |

### UI Component Libraries

| Library | Framework | Style | Best For |
|---------|-----------|-------|----------|
| **shadcn/ui** | React | Tailwind | Custom, accessible components |
| **Radix UI** | React | Headless | Accessible primitives |
| **Headless UI** | React/Vue | Headless | Tailwind projects |
| **Material UI (MUI)** | React | Material | Google design, enterprise |
| **Chakra UI** | React | Styled-system | Quick prototyping |
| **Ant Design** | React | Enterprise | Data-heavy dashboards |
| **Mantine** | React | Modern | Feature-rich, dark mode |
| **PrimeReact** | React | Premium | Enterprise, 90+ components |
| **Vuetify** | Vue | Material | Vue + Material Design |
| **Element Plus** | Vue | Enterprise | Vue enterprise apps |
| **DaisyUI** | Any | Tailwind | Tailwind component classes |

### State Management

| Technology | Best For | Learning Curve | Bundle Size |
|------------|----------|----------------|-------------|
| **Zustand** | Most React apps | Low | Tiny (1KB) |
| **Jotai** | Atomic state | Low | Tiny |
| **Redux Toolkit** | Complex state | Medium | Small |
| **TanStack Query** | Server state | Medium | Small |
| **Pinia** | Vue apps | Low | Tiny |
| **MobX** | Observable state | Medium | Medium |

---

## ⚙️ BACKEND TECHNOLOGIES

### Node.js Ecosystem

| Technology | Type | Best For | Notes |
|------------|------|----------|-------|
| **Node.js 22** | Runtime | All JS/TS backends | LTS, ESM native |
| **Bun** | Runtime | Fast builds, scripts | Newer, compatibility issues |
| **Deno** | Runtime | Security-focused | Different module system |

### Node.js Frameworks

| Framework | Style | Best For | Performance |
|-----------|-------|----------|-------------|
| **Express 5** | Minimal | APIs, middleware | Good |
| **Fastify** | Fast | High-perf APIs | Excellent |
| **NestJS** | Full | Enterprise, DDD | Good |
| **Hono** | Edge | Edge functions | Excellent |
| **Koa** | Minimal | Modern Express alternative | Good |
| **Adonis** | Full | Laravel-like experience | Good |
| **tRPC** | Type-safe | Full-stack TypeScript | N/A (RPC) |

### Python Backend

| Framework | Type | Best For | Performance |
|-----------|-------|----------|-------------|
| **FastAPI** | Modern | APIs, async | Excellent |
| **Django** | Full | Full-stack, admin | Good |
| **Flask** | Minimal | Small APIs | Good |

### Go Backend

| Framework | Type | Best For | Performance |
|-----------|-------|----------|-------------|
| **Fiber** | Fast | High-perf APIs | Excellent |
| **Gin** | Minimal | APIs | Excellent |
| **Echo** | Minimal | APIs | Excellent |

### .NET Backend

| Framework | Type | Best For |
|-----------|-------|----------|
| **ASP.NET Core 8** | Full | Enterprise, Azure |
| **Minimal APIs** | Minimal | Simple APIs |

---

## 🗄️ DATABASE TECHNOLOGIES

### SQL Databases

| Database | Best For | Pros | Cons |
|----------|----------|------|------|
| **PostgreSQL 16** | Most use cases | Feature-rich, extensions, JSON | Complex setup |
| **MySQL 8** | Web apps | Fast reads, widespread | Less features than PG |
| **SQLite** | Embedded, dev | Zero config, portable | Single writer |
| **SQL Server** | .NET ecosystem | Enterprise, Azure | Licensing cost |

### NoSQL Databases

| Database | Type | Best For |
|----------|------|----------|
| **MongoDB 7** | Document | Flexible schemas, aggregations |
| **Redis 7** | Key-Value | Caching, sessions, pub/sub |
| **DynamoDB** | Key-Value | AWS ecosystem, auto-scaling |
| **Cassandra** | Wide-column | Time series, huge scale |

### ORMs & Query Builders

| Technology | Language | Style | Best For |
|------------|----------|-------|----------|
| **Prisma** | TS/JS | ORM | Type-safe, migrations |
| **Drizzle** | TS/JS | Query builder | SQL-like, lightweight |
| **TypeORM** | TS/JS | ORM | Traditional ORM style |
| **Sequelize** | JS | ORM | Legacy projects |
| **Kysely** | TS | Query builder | Type-safe SQL |
| **SQLAlchemy** | Python | ORM | Python standard |
| **GORM** | Go | ORM | Go standard |

---

## 🎨 UI/UX DESIGN PATTERNS

### Design Styles Catalog

| Style | Characteristics | Best For |
|-------|-----------------|----------|
| **Glassmorphism** | Frosted glass, blur, transparency | Modern dashboards, cards |
| **Neumorphism** | Soft shadows, raised elements | Minimal interfaces |
| **Minimalism** | Clean, whitespace, simple | Professional, SaaS |
| **Brutalism** | Bold colors, raw edges | Creative, portfolios |
| **Dark Mode OLED** | Pure blacks, high contrast | Mobile-first, luxury |
| **Bento Grid** | Grid layout, mixed sizes | Dashboards, portfolios |
| **Claymorphism** | 3D, soft, playful | Mobile apps, fun products |
| **Aurora/Mesh Gradient** | Colorful gradient backgrounds | Landing pages, hero sections |

### Color Palette Categories

| Category | Primary Colors | Use Case |
|----------|----------------|----------|
| **SaaS/Tech** | Blue (#3B82F6), Indigo | B2B software |
| **E-commerce** | Orange (#F97316), Green | Shopping, conversion |
| **Healthcare** | Teal (#14B8A6), Blue | Medical, wellness |
| **Fintech** | Green (#22C55E), Navy | Banking, crypto |
| **Creative** | Purple (#8B5CF6), Pink | Design, social |
| **Enterprise** | Slate (#64748B), Blue | Corporate, B2B |

### Typography Recommendations

| Context | Font Pairing |
|---------|--------------|
| **Modern Tech** | Inter + Fira Code |
| **Professional** | Outfit + Inter |
| **Editorial** | Playfair Display + Source Sans |
| **Friendly** | Poppins + Open Sans |
| **Minimal** | Manrope + JetBrains Mono |

---

## 🛡️ AUTH & SECURITY

| Technology | Type | Best For |
|------------|------|----------|
| **NextAuth.js (Auth.js)** | Library | Next.js apps |
| **Clerk** | Managed | Quick setup, features |
| **Auth0** | Managed | Enterprise, SSO |
| **Supabase Auth** | Managed | Supabase projects |
| **Firebase Auth** | Managed | Firebase projects |
| **Keycloak** | Self-hosted | Enterprise, SSO |
| **Lucia** | Library | Flexible, self-hosted |
| **Better Auth** | Library | Modern, simple |

---

## ☁️ DEPLOYMENT & INFRASTRUCTURE

### Hosting Platforms

| Platform | Best For | Pros |
|----------|----------|------|
| **Vercel** | Next.js, static | Zero config, preview deployments |
| **Railway** | Full-stack | Easy databases, Postgres |
| **Render** | Full-stack | Simple, competitive pricing |
| **Fly.io** | Edge, containers | Global, Docker native |
| **AWS** | Enterprise | Full control, all services |
| **GCP** | ML, Big Data | Google integration |
| **Azure** | .NET, Enterprise | Microsoft ecosystem |

### Containerization

| Technology | Purpose |
|------------|---------|
| **Docker** | Container standard |
| **Kubernetes** | Orchestration |
| **Docker Compose** | Local multi-container |

---

## 📦 MOBILE

| Technology | Type | Best For |
|------------|------|----------|
| **React Native** | Cross-platform | React developers |
| **Flutter** | Cross-platform | Beautiful UI, single codebase |
| **Expo** | React Native tooling | Quick start, OTA updates |
| **Capacitor** | Web to native | Web developers |
| **Swift/SwiftUI** | iOS native | iOS only, best performance |
| **Kotlin** | Android native | Android only, best performance |

---

## 📊 SELECTION DECISION FRAMEWORK

When choosing technology, evaluate:

```
SCORE = (
  community_support * 0.20 +
  learning_curve * 0.15 +
  performance * 0.20 +
  debugging_ease * 0.15 +
  deployment_ease * 0.15 +
  long_term_maintenance * 0.15
)

community_support: Size, activity, Stack Overflow presence
learning_curve: Time to productivity for new developers
performance: Runtime performance, bundle size
debugging_ease: Error messages, tooling, observability
deployment_ease: CI/CD integration, hosting options
long_term_maintenance: Backward compatibility, release cycle
```

---

**Last Updated**: 2024
**Version**: 2.0
