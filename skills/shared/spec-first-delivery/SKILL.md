---
name: Spec First Delivery
description: Specification-driven development: define contract before implementation
---

# Spec First Delivery

## Spec First Workflow
1. Define the interface/contract (API schema, component props, function signature)
2. Write tests against the spec
3. Implement to make tests pass
4. Verify implementation matches spec exactly

## API Spec First
- Define OpenAPI/Swagger spec before coding
- Generate client SDKs from spec
- Validate responses against spec in tests
- Spec as single source of truth, code follows

## Component Spec First
- Define props interface with TypeScript
- Document expected behavior per prop combination
- Write Storybook stories as visual spec
- Implement to match stories exactly

## Benefits
- Frontend and backend can develop in parallel
- Tests exist before implementation
- Clear acceptance criteria from the start
- Changes to contract are explicit and visible

## Anti-Patterns
- Spec is written after implementation (documentation, not spec)
- Spec diverges from implementation (not kept in sync)
- Spec is too vague to test against
