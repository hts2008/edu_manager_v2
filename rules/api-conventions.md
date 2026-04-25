---
name: api-conventions
description: "REST design, response shapes, versioning, pagination, error formats"
version: "4.0"
enforcement: mandatory
human_override: "User can override with explicit justification documented in decisionLog.md"
---

# Rule: API Conventions

## R1: RESTful URL Design

```
GET    /api/v1/resources          â†’ List (paginated)
GET    /api/v1/resources/:id      â†’ Get single
POST   /api/v1/resources          â†’ Create (201)
PUT    /api/v1/resources/:id      â†’ Full replace (idempotent)
PATCH  /api/v1/resources/:id      â†’ Partial update
DELETE /api/v1/resources/:id      â†’ Soft delete (204)
```

- Use plural nouns (`/users` not `/user`)
- Use kebab-case for multi-word (`/order-items`)
- Max 2 levels of nesting (`/users/:id/orders`, not `/users/:id/orders/:orderId/items/:itemId`)
- Filter/sort/page via query params (`?status=active&sort=-created_at&page=2`)

## R2: Response Shape (consistent across all endpoints)

```json
{
  "data": {},           // null on error
  "meta": {             // pagination, timing, etc.
    "page": 1,
    "pageSize": 20,
    "totalItems": 145,
    "totalPages": 8
  },
  "errors": null        // array of error objects on failure
}
```

## R3: Error Response Format

```json
{
  "data": null,
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "field": "email",
      "message": "Email format is invalid",
      "details": {}
    }
  ]
}
```

- Always include `code` (machine-readable) and `message` (human-readable)
- Include `field` for validation errors
- Never expose stack traces, file paths, or SQL queries to client

## R4: HTTP Status Code Usage

| Status | When | Example |
|--------|------|---------|
| 200 | Successful read/update | GET, PUT, PATCH |
| 201 | Resource created | POST with `Location` header |
| 204 | Successful delete | DELETE (no body) |
| 400 | Malformed request | Missing required field |
| 401 | Not authenticated | Missing/invalid token |
| 403 | Not authorized | Valid token, wrong permissions |
| 404 | Not found | Resource doesn't exist |
| 409 | Conflict | Duplicate unique value |
| 422 | Business rule violation | Amount exceeds limit |
| 429 | Rate limited | Too many requests |
| 500 | Server error | Unexpected failure |

## R5: Pagination

- Default page size: 20, max: 100
- Offset-based for simple lists: `?page=2&pageSize=20`
- Cursor-based for real-time feeds: `?cursor=abc123&limit=20`
- Always include `totalItems` and `totalPages` in meta (offset-based)

## R6: Versioning

- URL prefix: `/api/v1/`, `/api/v2/`
- Maintain backward compatibility within a version
- Deprecation: announce 90 days before removing a version
- Only increment when breaking changes are unavoidable

## Verification

- Automated: API contract tests verify response shapes
- Review: backend-specialist + judge-agent verify conventions
- Tools: OpenAPI schema validation

## Related

- Agent: `agents/backend-specialist.md`
- Skills: `skills/backend/api-design/`