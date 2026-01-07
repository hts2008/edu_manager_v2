---
description: Generate handover document when switching to new chat window
---

# 🔄 CONTEXT HANDOVER WORKFLOW
<!-- VI: Quy trình bàn giao khi chuyển sang cửa sổ chat mới -->

> **Trigger**: Token limit approaching, `/handover` command, session end
> **Duration**: ~2 minutes

---

## WHEN TO TRIGGER

- User requests `/handover`
- Response tokens approaching limit warning
- Before long break
- Switching to different AI model
- Complex work requiring fresh context

---

## WORKFLOW STEPS

### Step 1: Summarize Session Work
```
COLLECT:
  - Tasks completed this session
  - Tasks in progress (with % complete)
  - Decisions made
  - Files created/modified
  - Problems encountered
```

### Step 2: Update PROJECT_CONTEXT.md
```
UPDATE sections:
  - Active Work (move completed to Recently Completed)
  - Key Decisions Made (append new decisions)
  - Lessons Learned Recent (if any)
  - Handover Notes (CRITICAL - write detailed notes)
```

### Step 3: Update KANBAN.md
```
MOVE tasks:
  - Started → IN PROGRESS
  - Completed → DONE
  - Blocked → Add blocker notes
```

### Step 4: Log Knowledge
```
IF bugs_found:
  CREATE: .shared/knowledge_base/bugs/active/BUG_{id}.md
  
IF lessons_learned:
  APPEND: .shared/knowledge_base/lessons_learned/
  
IF architecture_decisions:
  CREATE: .shared/knowledge_base/architecture/decisions/ADR_{id}.md
```

### Step 5: Generate Handover Document
```
WRITE to PROJECT_CONTEXT.md → Handover Notes:

### Last Session Summary
- **Agent**: {role}
- **Model**: {model_name}
- **Timestamp**: {ISO_datetime}
- **Work Done**: 
  - {completed_item_1}
  - {completed_item_2}
- **In Progress**:
  - {task_1}: {status_and_remaining}
- **Next Steps**:
  1. {recommended_next_action}
  2. {second_priority}

### Critical Context
{any_important_information_next_agent_must_know}

### Warnings
- ⚠️ {any_gotchas_or_cautions}
```

### Step 6: Confirm to User
```
OUTPUT:
  ✅ Handover Complete
  
  📄 Updated:
  - PROJECT_CONTEXT.md ✓
  - KANBAN.md ✓
  - Knowledge Base ✓
  
  📝 Summary:
  - Completed: {count} tasks
  - In Progress: {count} tasks
  - Bugs Logged: {count}
  
  🔄 Next session can resume from PROJECT_CONTEXT.md
  
  Recommended start command:
  /start-session
```

---

## COMMAND TEMPLATE

```
/handover
```

**Detailed handover:**
```
/handover --detailed
```

---

## IMPORTANT NOTES

1. **Always update PROJECT_CONTEXT.md** - This is the new session's lifeline
2. **Be specific in handover notes** - Assume next agent knows nothing
3. **Include file paths** - Exact locations of relevant files
4. **Note any tricky issues** - Things that weren't obvious
5. **Suggest next actions** - Help prioritize for next session
