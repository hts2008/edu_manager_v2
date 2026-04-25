---
name: observability
description: "Structured logging, error tracking, metrics, tracing"
version: "4.0"
enforcement: mandatory
human_override: "User can override with explicit justification documented in decisionLog.md"
---

# Rule: Observability

## R1: Structured Logging

```json
{
  "level": "error",
  "timestamp": "2026-03-26T15:30:00Z",
  "service": "user-api",
  "requestId": "abc-123",
  "userId": "user-456",
  "message": "Failed to update user profile",
  "error": { "code": "DB_CONNECTION", "message": "Connection timeout" },
  "metadata": { "retryCount": 3, "durationMs": 15000 }
}
```

- Use JSON format for machine parsing
- Include: level, timestamp, service, requestId, message
- Never log: passwords, tokens, credit cards, PII (mask if needed)
- Log levels: ERROR (alert), WARN (investigate), INFO (audit trail), DEBUG (dev only)

## R2: What to Log

| Event | Level | Include |
|-------|-------|---------|
| Request received | INFO | method, path, userId |
| Request completed | INFO | status, durationMs |
| Auth failure | WARN | userId (if known), IP, reason |
| Validation error | WARN | field, reason |
| External API call | INFO | service, durationMs, status |
| Unhandled error | ERROR | stack trace, context |
| Business event | INFO | eventType, entityId, userId |

## R3: Error Tracking

- Use dedicated error tracking (Sentry/equivalent)
- Upload source maps for meaningful stack traces
- Alert on new error types and error rate spikes
- Group errors by root cause (not by instance)

## R4: Health Endpoints

```
GET /health       → 200 { "status": "ok", "version": "1.2.3" }
GET /health/ready → 200 when service can handle requests
GET /health/live  → 200 when process is running
```

## R5: Request Tracing

- Generate unique `requestId` for each incoming request
- Pass `requestId` through all internal calls (headers, logs, queues)
- Include `requestId` in error responses (user can reference when reporting issues)

## Verification

- Automated: structured log validation, health endpoint checks
- Review: devops-engineer reviews logging and monitoring

## Related

- Agent: `agents/devops-engineer.md`
- Skills: `skills/monitoring-observability/`