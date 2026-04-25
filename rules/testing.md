---
name: testing
description: "Test pyramid, coverage targets, fixture patterns, CI requirements"
version: "4.0"
enforcement: mandatory
human_override: "User can override with explicit justification documented in decisionLog.md"
---

# Rule: Testing

## R1: Test Pyramid

- Unit: 70% (business logic, pure functions, utilities)
- Integration: 20% (API endpoints, DB queries, service boundaries)
- E2E: 10% (critical user journeys only)

## R2: Coverage Targets

| Layer | Minimum | Method |
|-------|---------|--------|
| Business logic | 90% | Line + branch |
| API endpoints | 80% | Each endpoint: happy + error path |
| UI components | 70% | Render + interaction |
| Utilities | 100% | All edge cases |
| Overall | 80% | Aggregate |

## R3: Test Naming

Pattern: `should [verb] when [condition]`
```typescript
it('should return 404 when user does not exist')
it('should throw ValidationError when email is empty')
it('should create order when all items are in stock')
```

## R4: Test Independence

- Each test creates its own data (no shared fixtures that mutate)
- Tests run in any order
- Tests clean up after themselves (transaction rollback or truncate)
- No `sleep()` or `waitForTimeout()` — use proper waits/assertions
- Flaky test = broken test — fix or delete within 48h

## R5: What NOT to Test

- Framework behavior (React rendering, Express routing)
- Simple getters/setters with no logic
- Third-party library internals
- Configuration files (unless they contain logic)

## R6: CI Requirements

- All tests must pass on every push
- Coverage report uploaded as artifact
- Failed tests block merge
- Test suite must complete in < 10 minutes (unit + integration)

## Verification

- Automated: coverage gates in CI, test report
- Review: test-engineer reviews test strategy

## Related

- Agent: `agents/test-engineer.md`, `agents/qa-automation-engineer.md`
- Skills: `skills/testing-strategies/`