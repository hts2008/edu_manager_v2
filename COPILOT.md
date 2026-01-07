# COPILOT.md - Agent_Coding Framework Instructions for GitHub Copilot
<!-- VI: Hướng dẫn cho GitHub Copilot. Đọc file này khi làm việc với VSCode -->

> **CRITICAL**: Reference this file when working with GitHub Copilot in VSCode.
> This file defines how Copilot should operate within the Agent_Coding framework.

---

## 🎯 COPILOT IN AGENT_CODING

GitHub Copilot works as part of the multi-agent development team. While Copilot excels at
inline code completion and suggestions, it should follow the framework's context management
and coordination protocols.

**Copilot Strengths:**
- ⚡ Fast inline code completion
- 📝 Code documentation generation
- 🔧 Code refactoring suggestions
- 💬 Chat-based assistance in VSCode

---

## 🚀 SESSION INITIALIZATION

<!-- VI: Khởi tạo phiên làm việc -->

**When starting work, use Copilot Chat with:**

```
@workspace Read PROJECT_CONTEXT.md and KANBAN.md to understand the current project state.
Summarize what's in progress and what I should work on next.
```

**Or reference specific context:**
```
@workspace /explain the current architecture from PROJECT_CONTEXT.md
@workspace What tech stack are we using? Check .shared/tech_stacks/
```

---

## 📋 COPILOT CHAT COMMANDS

<!-- VI: Lệnh chat với Copilot -->

### Context Loading
```
@workspace Summarize PROJECT_CONTEXT.md
@workspace Show active bugs from .shared/knowledge_base/bugs/active/
@workspace What lessons have we learned? Check .shared/knowledge_base/lessons_learned/
```

### Agent Role Assignment
```
@workspace Act as a Backend Engineer and help me design the API for [feature]
@workspace Act as a QA Engineer and write tests for [component]
@workspace Act as a Database Engineer and help optimize this query
```

### Development Tasks
```
@workspace /new Create a new component following our design system
@workspace /fix Fix this error following our coding standards
@workspace /tests Generate tests for this function
@workspace /docs Document this code
```

### Code Review
```
@workspace Review this code for:
- Adherence to our tech stack (.shared/tech_stacks/)
- Following patterns in our codebase
- Potential bugs based on .shared/knowledge_base/bugs/resolved/
```

### v3.0 NEW Commands
```
@workspace Use /cook workflow to implement [feature]
@workspace Use /ultrathink mode to analyze [problem]
@workspace Search GitHub for [solution]
@workspace Use /brainstorm to explore approaches for [topic]
@workspace Find files related to [query] using /scout
```

---

## 📁 KEY FILE REFERENCES

<!-- VI: Tham chiếu file quan trọng -->

Use `@workspace` to reference framework files:

| Reference | Purpose |
|-----------|---------|
| `@workspace PROJECT_CONTEXT.md` | Current project state |
| `@workspace KANBAN.md` | Task board |
| `@workspace .shared/tech_stacks/TECH_STACK_CATALOG.md` | Tech decisions |
| `@workspace .shared/ui_ux_patterns/` | Design patterns |
| `@workspace .shared/knowledge_base/` | Bugs & lessons |
| `@workspace .agent/workflows/` | Process definitions |

---

## 🔧 INLINE COMPLETION CONTEXT

<!-- VI: Ngữ cảnh cho code completion -->

For better inline suggestions, ensure:

1. **Project files are open** - Copilot uses open tabs for context
2. **Comments describe intent** - Write clear comments before coding
3. **Follow established patterns** - Be consistent with existing code

**Effective comment patterns:**
```typescript
// Create a function that handles user authentication
// using our standard auth flow from .shared/tech_stacks/nextjs_stack.md
// Returns: { success: boolean, user?: User, error?: string }

// VI: Hàm xử lý đăng nhập người dùng theo chuẩn project
```

---

## 📝 DOCUMENTATION GENERATION

<!-- VI: Tạo tài liệu tự động -->

Use Copilot to maintain documentation:

```
@workspace /docs Generate JSDoc for all functions in this file

@workspace Update PROJECT_CONTEXT.md with:
- New component added: [component]
- Tech decision: [decision]
- Progress: [what was done]

@workspace Create a bug report for .shared/knowledge_base/bugs/active/ about [issue]
```

---

## 🔄 HANDOVER ASSISTANCE

<!-- VI: Hỗ trợ bàn giao -->

Before ending session, ask Copilot:

```
@workspace Help me update PROJECT_CONTEXT.md with:
1. Summary of changes made in this session
2. Files modified: [list files]
3. Decisions made: [list decisions]
4. Next steps: [suggestions]

@workspace Update KANBAN.md - move TASK-XXX from "In Progress" to "Done"

@workspace Create handover notes summarizing today's work
```

---

## ⚙️ VSCODE SETTINGS

<!-- VI: Cài đặt VSCode khuyến nghị -->

Recommended `.vscode/settings.json`:
```json
{
  "github.copilot.enable": {
    "*": true,
    "markdown": true
  },
  "github.copilot.advanced": {
    "debug.overrideEngine": "gpt-4",
    "length": 500
  },
  "files.associations": {
    "*.agent.md": "markdown",
    "*.instructions.md": "markdown"
  }
}
```

---

## 🤝 MULTI-AGENT COORDINATION

<!-- VI: Phối hợp đa model -->

Copilot works alongside:
- **Claude** (via Claude Code or API) → Complex architecture, debugging
- **Gemini** (via Gemini Code Assist) → Design, vision tasks
- **GPT** (via Copilot) → Code generation, completions

**Coordination pattern:**
1. Read shared context from PROJECT_CONTEXT.md
2. Check if task is assigned to specific agent
3. If yes, follow that agent's workflow from `.agent/agents/`
4. Update shared context when done

---

## ⚠️ CRITICAL RULES

<!-- VI: Quy tắc bắt buộc -->

1. **REFERENCE PROJECT_CONTEXT.md** - Use `@workspace` to load context
2. **FOLLOW TECH STACK** - Check `.shared/tech_stacks/` for decisions
3. **UPDATE DOCUMENTATION** - Keep PROJECT_CONTEXT.md current
4. **USE KANBAN** - Track work in KANBAN.md
5. **LOG ISSUES** - Document bugs in knowledge_base
6. **CONSISTENT PATTERNS** - Follow existing code style

---

## 💡 TIPS FOR EFFECTIVE USE

<!-- VI: Mẹo sử dụng hiệu quả -->

### Better Completions
```
// Be specific in comments:
// ❌ "Create a button"
// ✅ "Create a primary button component with Glassmorphism style,
//    following .shared/ui_ux_patterns/design_systems/glassmorphism.md"
```

### Context Awareness
```
// Reference project patterns:
// "Similar to UserService in src/services/user.service.ts"
// "Following the pattern in .agent/agents/backend_engineer.agent.md"
```

### Generating Tests
```
// Specify test type:
// "Unit test for validateEmail function"
// "Integration test for user registration flow"
// "E2E test following .agent/workflows/06_qa_testing.md"
```

---

**Framework Version**: 3.0
**Last Updated**: 2026-01-04
**Compatibility**: GitHub Copilot (GPT-4 based), Copilot X
**Total Agents**: 19
