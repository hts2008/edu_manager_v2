---
name: Progress Update
description: Tracking work progress: append-only log, structured entries
---

# Progress Update

## Entry Format
- Date: ISO timestamp
- Sprint: current sprint ID
- What: specific work completed
- Evidence: test results, files changed, metrics
- Next: recommended next action

## Rules
- APPEND ONLY: never overwrite existing entries
- One entry per completed task or significant milestone
- Include quantitative evidence where possible
- Link to KANBAN task ID

## Content Guidelines
- Be specific: Created 5 API endpoints not Did backend work
- Include metrics: 85 percent test coverage, 200ms response time
- Note blockers encountered and how resolved
- Flag anything that needs follow-up

## Frequency
- After each task completion
- At session close
- When significant blocker resolved
- When decision changes project direction
