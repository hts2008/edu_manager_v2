---
name: performance
description: "Core Web Vitals, query limits, bundle budgets, caching rules"
version: "4.0"
enforcement: mandatory
human_override: "User can override with explicit justification documented in decisionLog.md"
---

# Rule: Performance

## R1: Core Web Vitals

| Metric | Target |
|--------|--------|
| LCP (Largest Contentful Paint) | < 2.5s |
| INP (Interaction to Next Paint) | < 200ms |
| CLS (Cumulative Layout Shift) | < 0.1 |

## R2: Bundle Budget

- Initial JS: < 200KB (gzipped)
- Per-route chunk: < 100KB (gzipped)
- Total CSS: < 50KB (gzipped)
- Images: WebP/AVIF, lazy-loaded, responsive srcset
- Fonts: subset, `font-display: swap`, â‰¤ 2 families

## R3: API Response Time

| Endpoint Type | Target |
|---------------|--------|
| List (paginated) | < 200ms |
| Single resource | < 100ms |
| Create/update | < 500ms |
| Complex computation | < 2s (or async with job queue) |

## R4: Database Query Limits

- Queries returning > 100 rows: must paginate
- Queries on tables > 10K rows: must have appropriate index
- Query execution time: < 100ms for simple, < 500ms for complex
- No unbounded queries in production (always LIMIT)
- Monitor slow query log (> 1s threshold)

## R5: Caching Requirements

- Static assets: `Cache-Control: public, max-age=31536000, immutable` (hashed filenames)
- API responses (public): consider CDN + `Cache-Control: public, max-age=300`
- Frequently accessed data: Redis with TTL-based invalidation
- Never cache: auth tokens, user-specific mutations, real-time data

## Verification

- Automated: Lighthouse CI, bundle size check, slow query log
- Review: performance-optimizer reviews when targets missed

## Related

- Agent: `agents/performance-optimizer.md`
- Skills: `skills/performance/performance-profiling/`