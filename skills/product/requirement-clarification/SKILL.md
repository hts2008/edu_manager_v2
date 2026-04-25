---
name: Requirement Clarification
description: Extracting clear requirements from vague requests
---

# Requirement Clarification

## Question Framework
- Who is the user? What is their goal?
- What does success look like? How do we measure it?
- What are the constraints (time, budget, tech)?
- What are the edge cases?
- What happens when it fails?

## Hidden Requirements
- Error handling for every input
- Loading and empty states for every view
- Mobile/responsive for every UI
- Auth/authz for every endpoint
- Logging/monitoring for every service

## Prioritization
- Must have: core functionality, blocking for launch
- Should have: important but workaround exists
- Could have: nice to have, defer if time-constrained
- Wont have: explicitly out of scope (document it)
