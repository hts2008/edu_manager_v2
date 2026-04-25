---
name: Refactor Patterns
description: Safe refactoring: extract, rename, move, inline, strangler fig
---

# Refactor Patterns

## Safe Refactoring Steps
1. Ensure full test coverage for code being refactored
2. Make one change at a time
3. Run tests after each change
4. Commit after each successful refactoring

## Common Refactorings
- Extract Function: long method into smaller named functions
- Extract Class: class doing too much into focused classes
- Rename: unclear name to intention-revealing name
- Move: misplaced code to correct module
- Inline: unnecessary abstraction back into caller

## Strangler Fig Pattern
- For legacy system replacement
- Route traffic to new system gradually
- Old and new coexist during migration
- Remove old system only when 100% migrated

## Code Smells Triggering Refactor
- Long method (over 20 lines)
- Large class (over 200 lines)
- Long parameter list (over 3 params)
- Duplicate code (same logic 3+ places)
- Feature envy (method uses another class data more than its own)
