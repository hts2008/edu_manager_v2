---
name: Unit Test Writer
description: Unit testing patterns: AAA structure, mocking, assertion, coverage
---

# Unit Test Writer

## AAA Pattern
- Arrange: set up test data and dependencies
- Act: execute the function under test
- Assert: verify the expected outcome

## Naming Convention
- describe('ClassName/functionName') > it('should behavior when condition')
- Test file colocated: Component.test.tsx next to Component.tsx

## Mocking
- Mock external dependencies only (API, DB, filesystem)
- Never mock the unit under test
- Use dependency injection for easy mocking
- Reset mocks between tests

## Assertions
- One logical assertion per test (multiple expects OK if same concern)
- Test both success and failure paths
- Test edge cases: null, undefined, empty, boundary values

## Coverage
- Aim for 80%+ on business logic
- 100% on critical paths (auth, payments, data mutations)
- Coverage is a metric, not a goal (high coverage != good tests)
