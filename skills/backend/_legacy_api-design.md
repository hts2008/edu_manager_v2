---
name: api-design
description: "REST API design, GraphQL, endpoint patterns, versioning"
---

# API Design Skill

## Quick Reference

### REST Endpoint Pattern
```
GET    /api/v1/{resources}          → List (paginated, filterable)
GET    /api/v1/{resources}/:id      → Single resource
POST   /api/v1/{resources}          → Create → 201 + Location header
PUT    /api/v1/{resources}/:id      → Full replace (idempotent)
PATCH  /api/v1/{resources}/:id      → Partial update
DELETE /api/v1/{resources}/:id      → Soft delete → 204
```

### Response Envelope
```json
{ "data": {}, "meta": { "page": 1, "pageSize": 20, "total": 100 }, "errors": null }
```

### Error Response
```json
{ "data": null, "errors": [{ "code": "VALIDATION_ERROR", "field": "email", "message": "Invalid email" }] }
```

## Sub-Skills
- `rest-design.md` — RESTful URL conventions, resource naming
- `graphql-patterns.md` — Query/mutation design, N+1 prevention
- `api-versioning.md` — URL vs header versioning, deprecation strategy
- `pagination.md` — Offset vs cursor pagination, infinite scroll APIs
- `rate-limiting.md` — Token bucket, sliding window, per-user limits

## Metrics
- API response time: < 200ms for list, < 100ms for single
- Error rate: < 1% for 5xx
- Documentation coverage: 100% of endpoints