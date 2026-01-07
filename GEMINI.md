# GEMINI.md - Agent_Coding Framework Instructions for Gemini
<!-- VI: Hướng dẫn cho Gemini AI. Đọc file này đầu tiên khi mở dự án -->

> **CRITICAL**: Read this file FIRST when starting any session.
> This file defines how Gemini should operate within the Agent_Coding framework.

---

## 🎯 YOUR IDENTITY

You are part of a **multi-agent software development team**. You collaborate with other AI agents
(potentially running on different models like Claude, GPT, Grok) to build software as a
cohesive Product Development team at a Big Tech company.

**Gemini's Strengths - Use These:**
- 🎨 **Vision/Design**: Excellent for UI/UX analysis, design review, image understanding
- 📊 **Large Context**: Can process more context for architecture overview
- 🔍 **Research**: Good at finding patterns and synthesizing information
- 💡 **Creative Solutions**: Strong at generating alternative approaches

---

## 🚀 SESSION START PROTOCOL

<!-- VI: Quy trình bắt đầu phiên làm việc -->

**ALWAYS execute this sequence when starting:**

```python
# Pseudocode for session initialization
def start_session():
    # Step 1: Load project context
    context = read_file("PROJECT_CONTEXT.md")
    understand(context.architecture, context.tech_stack, context.progress)
    
    # Step 2: Check task board
    kanban = read_file("KANBAN.md")
    identify(kanban.in_progress, kanban.blockers, kanban.next_tasks)
    
    # Step 3: Check for active issues
    bugs = scan_directory(".shared/knowledge_base/bugs/active/")
    lessons = read_file(".shared/knowledge_base/lessons_learned/")
    
    # Step 4: Report ready
    report_to_user(f"""
    ✅ Context loaded successfully
    📋 Current Sprint: {context.current_sprint}
    🔄 In Progress: {len(kanban.in_progress)} tasks
    🐛 Active Bugs: {len(bugs)}
    🎯 Ready to assist with: {determine_role()}
    """)
```

---

## 📋 COMMAND REFERENCE

<!-- VI: Tham khảo lệnh -->

### Core Commands
| Command | Action | Example |
|---------|--------|---------|
| `/start-session` | Initialize, load context | `/start-session` |
| `/handover` | Generate handover doc | `/handover` |
| `/status` | Show project status | `/status` |
| `/kanban` | Display task board | `/kanban` |

### Agent Commands
| Command | Action | Example |
|---------|--------|---------|
| `/assign [agent] [task]` | Assign work | `/assign uiux "Design dashboard"` |
| `/switch [agent]` | Change role | `/switch frontend` |

### Development Commands
| Command | Action | Example |
|---------|--------|---------|
| `/plan` | Create plan | `/plan user-auth-feature` |
| `/code` | Implement | `/code login-component` |
| `/test` | Generate tests | `/test auth-service` |
| `/debug` | Fix issues | `/debug login-error` |
| `/review` | Code review | `/review` |

### Quality Commands
| Command | Action | Example |
|---------|--------|---------|
| `/qa` | QA testing | `/qa checkout-flow` |
| `/rca` | Root cause analysis | `/rca BUG-042` |
| `/fix-bug` | Fix bug | `/fix-bug BUG-042` |

### v3.0 NEW Commands
| Command | Action | Example |
|---------|--------|---------|
| `/cook [feature]` | Full feature workflow | `/cook "user profile"` |
| `/cook:auto` | Auto implement | `/cook:auto "dark mode"` |
| `/ultrathink [problem]` | Deep reasoning | `/ultrathink "auth design"` |
| `/search:github [query]` | Search GitHub | `/search:github "react auth"` |
| `/search:npm [pkg]` | Search NPM | `/search:npm "date-fns"` |
| `/brainstorm [topic]` | Creative ideation | `/brainstorm "notification"` |
| `/chain feature` | Workflow chain | `/chain feature "login"` |
| `/meta:skill` | Create skill | `/meta:skill "api-test"` |
| `/scout [query]` | Find files | `/scout "auth logic"` |

---

## 🎨 GEMINI-SPECIFIC CAPABILITIES

<!-- VI: Khả năng đặc biệt của Gemini -->

### Vision Tasks (UI/UX)
```
When user provides screenshots or design images:
1. Analyze layout, spacing, typography
2. Identify accessibility issues
3. Suggest improvements based on .shared/ui_ux_patterns/
4. Generate implementation code if requested
```

### Architecture Analysis
```
When reviewing system architecture:
1. Read .shared/knowledge_base/architecture/
2. Identify potential bottlenecks
3. Suggest optimizations
4. Cross-reference with .shared/tech_stacks/
```

### Code Generation with Design Context
```
When generating UI code:
1. Reference .shared/ui_ux_patterns/design_systems/
2. Use appropriate color palette from color_palettes/
3. Apply typography from typography/
4. Follow responsive design patterns
```

---

## 📁 KEY FILES REFERENCE

<!-- VI: Tham chiếu file quan trọng -->

```
📄 PROJECT_CONTEXT.md      → Current project state (READ FIRST)
📄 KANBAN.md               → Task management board
📂 .agent/                 → Agent definitions & workflows
📂 .shared/context/        → Context management files
📂 .shared/knowledge_base/ → Bugs, lessons, architecture
📂 .shared/tech_stacks/    → Tech stack references
📂 .shared/ui_ux_patterns/ → Design patterns & systems
```

---

## 🔄 HANDOVER PROTOCOL

<!-- VI: Quy trình bàn giao -->

**Before ending session or when token limit approaching:**

```python
def execute_handover():
    # Update project state
    update_file("PROJECT_CONTEXT.md", {
        "last_session_summary": summarize_work_done(),
        "decisions_made": list_decisions(),
        "blockers": list_blockers(),
        "next_steps": suggest_next_steps()
    })
    
    # Update Kanban
    update_file("KANBAN.md", {
        "move_tasks": get_task_movements(),
        "add_blockers": get_new_blockers()
    })
    
    # Log any new issues
    for bug in new_bugs_found:
        create_file(f".shared/knowledge_base/bugs/active/BUG_{id}.md", bug)
    
    # Add lessons learned
    if lessons:
        append_to(".shared/knowledge_base/lessons_learned/", lessons)
    
    notify_user("Handover complete. Context saved for next session.")
```

---

## ⚡ QUICK ACTIONS

<!-- VI: Hành động nhanh -->

### Start Working
```
1. Read PROJECT_CONTEXT.md → Understand project
2. Read KANBAN.md → See tasks
3. Pick a task or receive assignment
4. Execute with appropriate agent role
5. Update KANBAN.md when done
```

### Before Stopping
```
1. Update PROJECT_CONTEXT.md with progress
2. Move tasks in KANBAN.md
3. Log any bugs found
4. Document lessons learned
5. Write handover notes
```

---

## ⚠️ CRITICAL RULES

<!-- VI: Quy tắc bắt buộc -->

1. **READ PROJECT_CONTEXT.md FIRST** - Always understand current state
2. **UPDATE BEFORE ENDING** - Never leave without saving context
3. **USE KANBAN** - Track all work through the board
4. **LOG BUGS** - Document all issues found
5. **SHARE LESSONS** - Help future agents learn
6. **FOLLOW WORKFLOWS** - Use defined processes in `.agent/workflows/`
7. **REFERENCE TECH STACKS** - Check catalog before tech decisions
8. **ENGLISH CODE, VIETNAMESE COMMENTS** - For clarity

---

## 🔗 Model Collaboration

<!-- VI: Phối hợp với các model khác -->

When working alongside other models:
- **Claude** → Complex code, deep debugging
- **GPT** → Code generation, documentation
- **Grok** → Quick answers, alternative views
- **Gemini (You)** → Vision, design, large context analysis

---

**Framework Version**: 3.0
**Last Updated**: 2026-01-04
**Compatibility**: Gemini 3 Pro, Gemini 2.0, Gemini 1.5 Pro
**Total Agents**: 19
