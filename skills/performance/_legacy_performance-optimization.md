---
name: performance-optimization
description: "Core Web Vitals, bundle optimization, query tuning, caching"
---

# Performance Optimization Skill

## Quick Reference

### Core Web Vitals Targets
| Metric | Good | Needs Work | Poor |
|--------|------|-----------|------|
| LCP | < 2.5s | 2.5-4.0s | > 4.0s |
| INP | < 200ms | 200-500ms | > 500ms |
| CLS | < 0.1 | 0.1-0.25 | > 0.25 |

### Bundle Optimization
- Code split: dynamic imports for routes and heavy components
- Tree shake: verify unused exports are eliminated
- Lazy load: images, below-fold content, modals
- Compress: gzip/brotli for all text assets
- Cache: immutable assets with content-hash filenames

### Database Query Optimization
```sql
-- Check query plan
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = $1;
-- Add index if sequential scan on large table
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id);
```

## Sub-Skills
- `web-vitals.md` — LCP/INP/CLS diagnosis and fixes
- `bundle-analysis.md` — Webpack/Vite bundle analyzer, code splitting
- `query-tuning.md` — EXPLAIN ANALYZE, index strategies
- `caching-strategies.md` — Redis, CDN, HTTP cache headers