---
name: API Patterns
description: RESTful API design, versioning, pagination, error responses
---

# API Patterns

## REST Conventions
- Resources as nouns: /users, /orders (not /getUsers)
- HTTP methods: GET read, POST create, PUT replace, PATCH update, DELETE remove
- Status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Server Error

## Versioning
- URL path: /api/v1/users (most common)
- Header: Accept: application/vnd.api+json;version=1
- Never break existing clients without version bump

## Pagination
- Cursor-based for real-time data: ?cursor=abc&limit=20
- Offset-based for static data: ?page=2&per_page=20
- Always include total count and next/prev links

## Error Response Format
- Consistent structure: { error: { code, message, details } }
- Include request_id for debugging
- Never expose stack traces in production

## Rate Limiting
- Return 429 Too Many Requests with Retry-After header
- Include X-RateLimit-Limit and X-RateLimit-Remaining headers
