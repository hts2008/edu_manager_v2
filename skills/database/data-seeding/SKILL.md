---
name: Data Seeding
description: Database seeding: test data, fixtures, factory patterns
---

# Data Seeding

## Seeding Strategy
- Reference data: always seed (countries, currencies, roles)
- Test data: seed for development/staging, never production
- Use factories for randomized test data

## Factory Pattern
- Define factories per model with sensible defaults
- Override specific fields for test scenarios
- Use sequences for unique values (user-1, user-2)

## Best Practices
- Idempotent seeds (upsert, not insert)
- Separate seed files by domain
- Seed in dependency order (users before orders)
