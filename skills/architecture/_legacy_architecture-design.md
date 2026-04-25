---
name: architecture-design
description: "System architecture patterns, module boundaries, scalability decisions"
---

# Architecture Design Skill

## Quick Reference

### Architecture Decision Checklist
1. What problem does this solve?
2. What are the alternatives? (≥ 2)
3. What are the trade-offs?
4. What are the failure modes?
5. How does it scale?
6. How does it integrate with existing system?

### Common Patterns
| Pattern | When | Example |
|---------|------|---------|
| Modular Monolith | Single team, < 100K users | Most SaaS startups |
| Microservices | Multiple teams, independent deploy | Netflix, Uber |
| Serverless | Event-driven, variable load | AWS Lambda + API Gateway |
| Event-Driven | Async workflows, decoupled services | Order processing pipeline |
| CQRS | Read-heavy with complex queries | Analytics dashboards |

### ADR Template
```markdown
# ADR-XXX: [Title]
## Status: Proposed | Accepted | Deprecated
## Context: [Problem]
## Decision: [Choice + Reasoning]
## Consequences: [Trade-offs]
```

## Sub-Skills
- `modular-monolith.md` — Module boundaries, shared kernel, anti-corruption layer
- `microservices.md` — Service decomposition, inter-service communication
- `event-driven.md` — Event sourcing, CQRS, saga pattern
- `clean-architecture.md` — Dependency inversion, use cases, entities
- `scalability.md` — Horizontal scaling, caching layers, CDN

## Anti-Patterns
- Big Ball of Mud: No module boundaries → everything coupled
- Distributed Monolith: Microservices that must deploy together
- Golden Hammer: Using one pattern for all problems