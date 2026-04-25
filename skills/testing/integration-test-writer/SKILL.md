---
name: Integration Test Writer
description: Integration testing: API testing, database testing, service testing
---

# Integration Test Writer

## API Integration Tests
- Test full request/response cycle
- Use real database (test instance, not mocks)
- Seed test data before each test, clean after

## Database Tests
- Use transactions: begin before test, rollback after
- Test migrations up and down
- Verify constraints and triggers

## Service Integration
- Test service-to-service communication
- Use contract testing (Pact) for API contracts
- Test error scenarios: timeout, 500, invalid response

## Test Environment
- Docker Compose for local integration testing
- Separate test database with same schema
- CI pipeline runs integration tests on every PR
