---
name: Service Layer Pattern
description: Business logic encapsulation, dependency injection, clean architecture
---

# Service Layer Pattern

## Layer Responsibilities
- Controller: HTTP handling, request parsing, response formatting
- Service: business logic, orchestration, validation rules
- Repository: data access, queries, persistence

## Dependency Injection
- Constructor injection preferred
- Interface-based for testability
- Composition root at application startup

## Transaction Management
- Service layer owns transaction boundaries
- Unit of Work pattern for multi-repository operations
- Rollback on any failure within transaction

## Error Translation
- Repository throws data errors
- Service translates to business errors
- Controller translates to HTTP errors
