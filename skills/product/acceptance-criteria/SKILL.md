---
name: Acceptance Criteria
description: Writing clear acceptance criteria: Given-When-Then, testable conditions
---

# Acceptance Criteria

## Given-When-Then Format
- Given [precondition/context]
- When [action/trigger]
- Then [expected outcome]

## Good Criteria Characteristics
- Testable: can write automated test for it
- Specific: no ambiguous words (fast, user-friendly)
- Independent: each criterion standalone
- Complete: covers happy path, error path, edge cases

## Examples
- Good: Given a logged-in user, When they click Logout, Then session is invalidated and user is redirected to login page
- Bad: The logout should work properly

## Anti-Patterns
- Implementation details in criteria (use React, store in Redis)
- Missing error scenarios
- Untestable: the system should be fast
