---
name: Cache Strategy
description: Caching patterns: browser, CDN, API, database caching strategies
---

# Cache Strategy

## Cache Layers
- Browser cache: HTTP headers (Cache-Control, ETag)
- CDN cache: edge servers closer to users
- Application cache: in-memory (Redis, Memcached)
- Database cache: query result cache, materialized views

## HTTP Caching
- Static assets: Cache-Control: public, max-age=31536000, immutable
- API responses: Cache-Control: private, max-age=60
- Use ETag for conditional requests
- Versioned filenames for cache busting (app.abc123.js)

## Redis Caching Patterns
- Cache-aside: check cache first, fetch from DB on miss
- Write-through: update cache on write
- TTL: set expiry based on data freshness requirements

## Invalidation
- TTL-based: simple, eventual consistency
- Event-based: invalidate on data change
- Key patterns: user:123:profile for targeted invalidation
- Never cache: auth tokens, user-specific sensitive data
