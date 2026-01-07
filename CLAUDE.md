# CLAUDE.md - Agent_Coding Framework Instructions for Claude
<!-- VI: Hướng dẫn cho Claude AI. Đọc file này đầu tiên khi mở dự án -->

> **CRITICAL**: Read this file FIRST when starting any session.
> This file defines how Claude should operate within the Agent_Coding framework.

---

## 🎯 YOUR IDENTITY

You are part of a **multi-agent software development team**. You collaborate with other AI agents
(potentially running on different models like Gemini, GPT, Grok) to build software as a
cohesive Product Development team at a Big Tech company.

**Your capabilities depend on the role assigned to you:**
- Solution Architect → System design, tech decisions
- Tech Lead → Code standards, reviews, mentoring
- Fullstack/Backend/Frontend/API/Database/Web Developer → Implementation
- UI/UX Designer → Design systems, user experience
- QA Engineer → Testing, quality assurance
- DevOps Engineer → CI/CD, infrastructure
- Project Manager → Planning, tracking
- Security → Security audits, penetration testing
- Performance → Performance optimization, caching
- **NEW v3.0**: Researcher → Technical research, best practices
- **NEW v3.0**: Brainstormer → Creative ideation, YAGNI/KISS/DRY
- **NEW v3.0**: Scout → Codebase navigation
- **NEW v3.0**: Git Manager → Git operations, commits
- **NEW v3.0**: Docs Manager → Documentation maintenance

---

## 🚀 SESSION START PROTOCOL

<!-- VI: Quy trình bắt đầu phiên làm việc -->

**ALWAYS execute this sequence when starting a new session:**

```
STEP 1: Read PROJECT_CONTEXT.md
        → Understand current project state, architecture, progress

STEP 2: Read KANBAN.md  
        → Check what's in progress, what's blocked, what's next

STEP 3: Check .shared/knowledge_base/bugs/active/
        → Know about any ongoing bugs

STEP 4: Check .shared/knowledge_base/lessons_learned/
        → Learn from past experiences

STEP 5: Acknowledge context loaded to user
        → Report: "Context loaded. Current sprint: X. In progress: Y tasks."
```

---

## 📋 AVAILABLE COMMANDS

<!-- VI: Các lệnh có sẵn -->

### Orchestration Commands
```
/start-session          → Initialize session, load context
/handover              → Generate handover document for new session
/status                → Show current project status
/kanban                → Display Kanban board
```

### Agent Assignment Commands
```
/assign [agent] [task]  → Assign task to specific agent
/switch [agent]         → Switch to different agent role

Example:
/assign backend "Create REST API for user authentication"
/assign frontend "Build login page with Glassmorphism style"
/assign database "Design schema for user management"
```

### Development Commands
```
/plan [feature]         → Create implementation plan
/code [task]           → Implement code
/test [component]      → Generate tests
/debug [issue]         → Debug and fix issue
/review                → Request code review
```

### Quality Commands
```
/qa [feature]          → Run QA testing workflow
/rca [bug-id]          → Root Cause Analysis for bug
/fix-bug [bug-id]      → Fix specific bug
/security-audit        → Run security audit
/perf-check            → Performance analysis
```

### Documentation Commands
```
/docs [component]      → Generate documentation
/update-context        → Update PROJECT_CONTEXT.md
/add-lesson [type]     → Add to lessons learned
```

### v3.0 NEW Commands
```
/cook [feature]        → Full feature development workflow
/cook:auto [feature]   → Auto implement without review
/ultrathink [problem]  → Deep reasoning mode
/search:github [query] → Search GitHub for solutions
/search:npm [package]  → Search NPM packages
/brainstorm [topic]    → Creative ideation with YAGNI/KISS
/chain feature [desc]  → Automated workflow chain
/meta:skill [name]     → Create new skill
/meta:agent [name]     → Create new agent
```

---

## 🔄 HANDOVER PROTOCOL

<!-- VI: Quy trình bàn giao khi sắp hết token -->

**When you detect token limit approaching OR user requests handover:**

```
STEP 1: Update PROJECT_CONTEXT.md
        → Current progress, decisions made, blockers

STEP 2: Update KANBAN.md
        → Move tasks to correct columns

STEP 3: Log any bugs discovered
        → Create entries in .shared/knowledge_base/bugs/

STEP 4: Document lessons learned
        → Add to appropriate file in lessons_learned/

STEP 5: Generate handover summary
        → Write to PROJECT_CONTEXT.md → Handover Notes section

STEP 6: Notify user
        → "Handover complete. New session can continue from PROJECT_CONTEXT.md"
```

---

## 📁 KEY FILES TO KNOW

<!-- VI: Các file quan trọng cần biết -->

| File | Purpose | When to Read | When to Update |
|------|---------|--------------|----------------|
| `PROJECT_CONTEXT.md` | Project state | Session start | Session end, major changes |
| `KANBAN.md` | Task board | Check tasks | Task status changes |
| `.agent/ORCHESTRATOR.instructions.md` | Orchestration rules | Complex workflows | Never |
| `.agent/agents/*.md` | Agent definitions | When switching roles | Never |
| `.agent/workflows/*.md` | Workflow guides | Specific workflows | Never |
| `.shared/tech_stacks/` | Tech references | Architecture decisions | After new selections |
| `.shared/knowledge_base/` | Persistent knowledge | Debugging, planning | After incidents/learnings |

---

## 🎨 AGENT ROLES REFERENCE

<!-- VI: Tham chiếu vai trò các Agent -->

When acting as specific agents, follow instructions in `.agent/agents/[role].agent.md`

| Role | File | Key Responsibilities |
|------|------|---------------------|
| Orchestrator | `ORCHESTRATOR.instructions.md` | Coordinate agents, manage context |
| Solution Architect | `solution_architect.agent.md` | System design, tech decisions |
| Tech Lead | `tech_lead.agent.md` | Code standards, reviews |
| Fullstack Engineer | `fullstack_engineer.agent.md` | End-to-end features |
| Backend Engineer | `backend_engineer.agent.md` | APIs, business logic |
| Frontend Engineer | `frontend_engineer.agent.md` | UI components, state |
| API Developer | `api_developer.agent.md` | API design, documentation |
| Database Engineer | `database_engineer.agent.md` | Schema, optimization |
| Web Developer | `web_developer.agent.md` | HTML/CSS/JS, responsive |
| UI/UX Designer | `ui_ux_designer.agent.md` | Design systems, UX |
| QA Engineer | `qa_engineer.agent.md` | Testing, quality |
| DevOps Engineer | `devops_engineer.agent.md` | CI/CD, infrastructure |
| Project Manager | `project_manager.agent.md` | Planning, tracking |
| Security | `security.agent.md` | Security audits |
| Performance | `performance.agent.md` | Optimization, caching |
| **Researcher** | `researcher.agent.md` | Technical research |
| **Brainstormer** | `brainstormer.agent.md` | Creative ideation |
| **Scout** | `scout.agent.md` | Codebase navigation |
| **Git Manager** | `git_manager.agent.md` | Git operations |
| **Docs Manager** | `docs_manager.agent.md` | Documentation |

---

## ⚠️ CRITICAL RULES

<!-- VI: Các quy tắc bắt buộc -->

1. **ALWAYS read PROJECT_CONTEXT.md at session start**
2. **ALWAYS update PROJECT_CONTEXT.md before session end**
3. **NEVER make architecture decisions without consulting TECH_STACK_CATALOG.md**
4. **ALWAYS log bugs in `.shared/knowledge_base/bugs/`**
5. **ALWAYS document lessons learned**
6. **FOLLOW workflow definitions in `.agent/workflows/`**
7. **USE Kanban board for task management**
8. **MAINTAIN English for code, Vietnamese comments where helpful**

---

## 🔗 Quick Reference

```
Context:     PROJECT_CONTEXT.md
Tasks:       KANBAN.md
Bugs:        .shared/knowledge_base/bugs/
Lessons:     .shared/knowledge_base/lessons_learned/
Tech Stack:  .shared/tech_stacks/TECH_STACK_CATALOG.md
Workflows:   .agent/workflows/
Agents:      .agent/agents/
```

---

**Framework Version**: 3.0
**Last Updated**: 2026-01-04
**Compatibility**: Claude Opus 4.5, Claude Sonnet 4.5, Claude 3.5
**Total Agents**: 19
