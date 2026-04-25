---
name: Next.js App Router
description: App Router patterns: server components, layouts, streaming, data fetching
---

# Next.js App Router

## Server vs Client Components
- Default is Server Component. Add 'use client' only when needed
- Server: data fetching, backend access, secrets. Client: interactivity, hooks, browser APIs
- Keep client boundary as low in tree as possible

## Layout Patterns
- layout.tsx wraps children, persists across navigation
- page.tsx is unique content per route
- loading.tsx for Suspense boundary per route
- error.tsx for error boundary per route
- not-found.tsx for 404 handling

## Data Fetching
- Server Components: fetch directly, no useEffect needed
- Parallel data fetching: Promise.all for independent requests
- Use generateMetadata for dynamic SEO

## Streaming
- Loading UI with Suspense boundaries
- Streaming SSR for slow data sources
- Use loading.tsx for route-level, Suspense for component-level

## Caching
- fetch() auto-cached in Server Components
- revalidatePath/revalidateTag for on-demand revalidation
- unstable_cache for non-fetch data sources

## Route Handlers
- app/api/route.ts for API endpoints
- Support GET, POST, PUT, DELETE exports
- Return NextResponse.json() for JSON responses
