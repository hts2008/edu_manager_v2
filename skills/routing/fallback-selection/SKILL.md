---
name: Fallback Selection
description: Agent fallback strategy: when primary fails, how to reroute
---

# Fallback Selection

## Fallback Hierarchy
1. Primary specialist agent
2. Related specialist (frontend-specialist for UI bugs)
3. Generalist (orchestrator with focused prompt)
4. CLI subagent (different model perspective)
5. User escalation

## When To Fallback
- Agent produces empty or invalid output
- Agent fails same task 3 times
- Agent output fails quality gates
- Agent exceeds time budget

## Rerouting Rules
- Log why primary failed before rerouting
- Provide failure context to fallback agent
- Do not retry with same approach if it failed twice
- Escalate to user after 2 different agents fail

## Anti-Patterns
- Silent fallback without logging
- Infinite retry loops
- Routing to same agent with same prompt
- Skipping QA because fallback took too long
