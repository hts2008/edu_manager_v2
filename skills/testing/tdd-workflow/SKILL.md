---
name: TDD Workflow
description: Test-Driven Development: Red-Green-Refactor cycle, test-first design
---

# TDD Workflow

## TDD Cycle
1. RED: Write a failing test that defines desired behavior
2. GREEN: Write minimal code to make the test pass
3. REFACTOR: Clean up code while keeping tests green

## When To Use TDD
- Business logic with complex rules
- Algorithm implementation
- Bug fixes (write test that reproduces bug first)
- API contract implementation

## When NOT To Use TDD
- Exploratory/prototyping code
- UI layout (visual testing is better)
- One-off scripts

## Test-First Benefits
- Forces thinking about interface before implementation
- Guarantees test coverage for new code
- Catches regressions immediately
- Documentation through test cases

## Common Pitfalls
- Testing implementation details instead of behavior
- Making tests too coupled to code structure
- Skipping refactor step
