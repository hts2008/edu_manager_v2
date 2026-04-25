---
name: Architecture Patterns
description: Software architecture: clean architecture, hexagonal, event-driven, CQRS
---

# Architecture Patterns

## Clean Architecture
- Entities at center (business rules, no dependencies)
- Use Cases surround entities (application logic)
- Interface Adapters (controllers, presenters, gateways)
- Frameworks at outer ring (DB, web, UI)
- Dependency Rule: inner layers never import from outer

## Hexagonal (Ports and Adapters)
- Ports: interfaces defined by business logic
- Adapters: implementations for specific tech (PostgresUserRepo)
- Easy to swap implementations (test, production, migration)

## Event-Driven
- Publish events, subscribers react asynchronously
- Use for: notifications, audit logs, cache invalidation
- Message brokers: Redis Pub/Sub, RabbitMQ, Kafka

## CQRS
- Separate Command (write) and Query (read) models
- Optimize read model for query patterns
- Use when read/write patterns differ significantly
