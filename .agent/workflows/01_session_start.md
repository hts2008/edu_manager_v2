---
description: Initialize a new session, load context, and prepare to work
---

# 🚀 SESSION START WORKFLOW
<!-- VI: Quy trình khởi động phiên làm việc mới -->

> **Trigger**: New chat window opened, `/start-session` command
> **Duration**: ~1 minute

---

## WORKFLOW STEPS

### Step 1: Load Project Context
```
READ: PROJECT_CONTEXT.md
EXTRACT:
  - Project overview
  - Current architecture
  - Tech stack
  - Current sprint details
  - Active work
  - Handover notes from last session
```

### Step 2: Load Task Board
```
READ: KANBAN.md
IDENTIFY:
  - IN PROGRESS tasks (continue these)
  - BLOCKED tasks (resolve if possible)
  - TODO tasks (next candidates)
  - REVIEW tasks (may need attention)
```

### Step 3: Check Active Issues
```
SCAN: .shared/knowledge_base/bugs/active/
COUNT and NOTE:
  - Critical bugs (must fix)
  - High priority bugs (should fix soon)
  - Bug context for debugging
```

### Step 4: Load Recent Lessons
```
READ: .shared/knowledge_base/lessons_learned/GOTCHAS.md
UNDERSTAND:
  - Project-specific issues to avoid
  - Recent patterns that work
  - Known limitations
```

### Step 5: Report to User
```
FORMAT: 
  ✅ Context loaded successfully
  📋 Project: {project_name}
  🎯 Sprint: {sprint_name} ({progress})
  🔄 In Progress: {count} tasks
  🚧 Blockers: {count}
  🐛 Active Bugs: {count}
  
  📝 Last Session Notes:
  {handover_notes_summary}
  
  🎯 Recommended Next Action:
  {suggested_action based on priority}
```

---

## EXAMPLE OUTPUT

```markdown
✅ Context loaded successfully

📋 Project: Super Platform
🎯 Sprint: Sprint 3 - User Authentication (5/12 tasks)
🔄 In Progress: 2 tasks
🚧 Blockers: 0
🐛 Active Bugs: 1 (Medium)

📝 Last Session Notes:
Backend engineer completed user registration API.
Frontend work on login page at 60%.
Need to integrate OAuth providers next.

🎯 Recommended Next Action:
Continue TASK-042: Login Page Implementation
```

---

## COMMAND TEMPLATE

```
/start-session
```

**For specific IDE:**
- **Cursor/Antigravity**: `/start-session`
- **Claude Code**: "Read CLAUDE.md and start a new session"
- **VSCode + Copilot**: "@workspace Initialize session using GEMINI.md"
