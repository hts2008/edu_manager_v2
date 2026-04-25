---
name: error-handling
description: "Error hierarchy, handling patterns, logging, user-facing messages"
version: "4.0"
enforcement: mandatory
human_override: "User can override with explicit justification documented in decisionLog.md"
---

# Rule: Error Handling

## R1: Never Swallow Errors

```typescript
// ❌ FORBIDDEN
try { riskyOperation(); } catch (e) { /* silence */ }

// ✅ REQUIRED
try {
  riskyOperation();
} catch (error) {
  logger.error('Operation failed', { error, context: { userId } });
  throw new AppError('OPERATION_FAILED', 'Unable to complete operation', error);
}
```

## R2: Error Hierarchy

```
AppError (base)
├── ValidationError     → 400 (bad input)
├── AuthenticationError → 401 (not logged in)
├── AuthorizationError  → 403 (not permitted)
├── NotFoundError       → 404 (resource missing)
├── ConflictError       → 409 (duplicate, version mismatch)
├── BusinessRuleError   → 422 (domain violation)
└── InternalError       → 500 (unexpected failure)
```

Each error has: `code` (machine-readable string), `message` (human-readable), `statusCode` (HTTP), optional `details`.

## R3: Error Boundaries

- **Controller layer**: catch and translate domain errors → HTTP responses
- **Service layer**: throw domain-specific errors (`NotFoundError`, `BusinessRuleError`)
- **Data layer**: catch DB errors → throw domain errors (not raw SQL errors)
- **Global handler**: catch unhandled errors → log + return 500 (no stack trace to client)

## R4: User-Facing Error Messages

- Never expose: stack traces, file paths, SQL queries, internal IDs
- Always include: what went wrong (brief), what to do (action)
- Validation errors: list specific field + issue

```json
{"message": "Unable to create account", "action": "Please try again or contact support"}
```

## R5: Retry & Fallback

- Network errors: retry 3 times with exponential backoff (1s, 2s, 4s)
- Timeout errors: set explicit timeouts (default 10s for HTTP, 30s for DB)
- Queue errors: retry 3 times, then dead-letter queue
- Cascade failure: circuit breaker pattern for external services

## Verification

- Automated: no empty catch blocks (ESLint), error handler tests
- Review: judge-agent checks error handling in every endpoint

## Related

- Agent: `agents/debugger.md`, `agents/backend-specialist.md`
- Skills: `skills/error-handling/`