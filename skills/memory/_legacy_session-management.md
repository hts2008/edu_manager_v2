---
name: session-management
description: "Session start/close protocols, handoff, context continuity"
---

# Session Management Skill

## Quick Reference

### Session Start Checklist
1. Read `KANBAN.md` → sprint state, active tasks
2. Read `memory/memory-bank/activeContext.md` → current state
3. Read `memory/memory-bank/progress.md` → last 5 entries
4. Read `memory/memory-bank/decisionLog.md` → decisions
5. Read `memory/sessions/current-session.md` → resume point
6. Report: "Sprint [N]: [X] done, [Y] in progress. Resume: [task]"

### Session Close Checklist
1. Verify evidence for all completed tasks
2. Update KANBAN.md task statuses
3. Rewrite activeContext.md (current state)
4. Append to progress.md (NEVER overwrite)
5. Update handoff.md (what, partial, blocked, next, don't forget)
6. Log session event to session-events.jsonl

### handoff.md Template
```markdown
## What was done
## What is partially done
## What is blocked
## What should be done next
## What must not be forgotten
```

## Anti-Patterns
- Starting work without reading memory/KANBAN
- Closing session without updating handoff
- Forgetting to record blockers