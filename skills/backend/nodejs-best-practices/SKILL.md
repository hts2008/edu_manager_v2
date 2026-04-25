---
name: Node.js Best Practices
description: Node.js patterns: async/await, error handling, project structure
---

# Node.js Best Practices

## Async Patterns
- Always use async/await over callbacks
- Promise.all for parallel operations, Promise.allSettled when partial failure OK
- Never create unhandled promise rejections

## Error Handling
- Custom error classes extending Error
- Global error handler middleware (Express/Fastify)
- Operational errors (expected) vs programmer errors (bugs)
- Never swallow errors silently

## Project Structure
- Feature-based: src/features/users/, src/features/orders/
- Shared: src/shared/middleware/, src/shared/utils/
- Config: src/config/ with env validation (Zod)

## Security
- Helmet for HTTP headers, CORS properly configured
- Input validation at controller layer
- SQL injection prevention via parameterized queries
- Rate limiting on auth endpoints

## Performance
- Connection pooling for databases
- Compression middleware for responses
- Cluster mode or PM2 for multi-core utilization
