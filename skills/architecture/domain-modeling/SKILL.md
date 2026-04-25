---
name: Domain Modeling
description: DDD patterns: aggregates, entities, value objects, domain events
---

# Domain Modeling

## Core Concepts
- Entity: identity-based, mutable (User, Order)
- Value Object: equality by value, immutable (Money, Address)
- Aggregate: consistency boundary, accessed via root entity
- Domain Event: something interesting that happened (OrderPlaced)

## Aggregate Design Rules
- Keep aggregates small (1-3 entities)
- Reference other aggregates by ID, not by object
- One transaction per aggregate
- Use domain events for cross-aggregate communication

## Repository Pattern
- One repository per aggregate root
- Repository returns/accepts aggregate roots only
- Encapsulates query logic

## Domain Services
- Logic that doesnt belong to any single entity
- Stateless, operates on multiple aggregates
- Example: TransferService.transfer(from, to, amount)
