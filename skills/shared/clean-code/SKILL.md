---
name: Clean Code
description: Code quality principles: naming, structure, readability, maintainability
---

# Clean Code

## Naming
- Variables: descriptive nouns (userEmail, orderTotal)
- Functions: action verbs (calculateTotal, validateInput)
- Booleans: is/has/can prefix (isActive, hasPermission)
- Constants: UPPER_SNAKE_CASE (MAX_RETRIES)
- Classes: PascalCase nouns (UserService, OrderRepository)

## Function Design
- Single responsibility: one function, one purpose
- Maximum 20 lines (extract if longer)
- Maximum 3 parameters (use object if more)
- No side effects in pure functions
- Return early for guard clauses

## Code Organization
- Group by feature, not by type
- Keep related code close together
- One concept per file
- Clear module boundaries

## Readability
- Prefer explicit over clever
- Self-documenting code over comments
- Consistent formatting (use formatter)
- Logical ordering: public before private, important before utility

## Maintenance
- DRY: extract when logic appears 3+ times
- YAGNI: dont add features you might need later
- KISS: simplest solution that works
- Boy Scout Rule: leave code better than you found it
