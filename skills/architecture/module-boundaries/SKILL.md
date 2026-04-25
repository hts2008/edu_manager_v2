---
name: Module Boundaries
description: Module design: cohesion, coupling, interface contracts, bounded contexts
---

# Module Boundaries

## Cohesion Principles
- High cohesion: module does one thing well
- Functional cohesion (ideal): all elements contribute to single task
- Avoid coincidental cohesion: unrelated code grouped by convenience

## Coupling Rules
- Loose coupling: modules communicate through interfaces
- No circular dependencies between modules
- Data coupling preferred (pass only needed data)
- Avoid stamp coupling (passing entire objects when only fields needed)

## Bounded Context (DDD)
- Each context has its own ubiquitous language
- Same word may mean different things in different contexts
- Context map: define relationships between contexts
- Anti-corruption layer between legacy and new contexts

## Interface Design
- Expose behavior, not data (tell, dont ask)
- Stable interfaces, flexible implementations
- Versioned APIs between modules
- Contracts validated at build time
