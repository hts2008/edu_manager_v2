# 🚀 Agent_Coding Framework

> **Comprehensive AI Agent Orchestration System for Software Development**
> 
> Enable multiple AI models (Gemini, Claude, GPT, Grok) to work as a coordinated Product Development team.

<!-- VI: Framework điều phối AI Agent toàn diện cho phát triển phần mềm -->

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **🎯 19 Specialized Agents** | Architect, Tech Lead, Fullstack, Backend, Frontend, API, Database, Web, UI/UX, QA, DevOps, PM, Security, Performance, **Researcher**, **Brainstormer**, **Scout**, **Git Manager**, **Docs Manager** |
| **🔮 Meta Capabilities** | Meta-Skill to create new skills/agents/workflows |
| **🧠 UltraThink Mode** | Deep reasoning for complex problems |
| **🔍 Proactive Research** | Auto-search GitHub, StackOverflow, npm before implementing |
| **🔄 Context Persistence** | Solve token limit problem with automatic context handover |
| **📋 Kanban Management** | Track progress with built-in Kanban board |
| **🐛 Bug & RCA Tracking** | Structured bug tracking with Root Cause Analysis |
| **📚 Knowledge Base** | Persistent lessons learned and architectural decisions |
| **🎨 UI/UX Patterns** | 57 design styles, 95 color palettes, 56 font pairings, 98 UX guidelines |
| **🛠️ Multi-IDE Support** | VSCode, Cursor, Antigravity, Windsurf, Claude Code |

---

## 🚀 Quick Start

### 1. Copy to Your Project
<!-- VI: Bước 1 - Copy thư mục này vào dự án của bạn -->

```bash
# Copy entire Agent_Coding folder to your project root
cp -r Agent_Coding/* /path/to/your/project/
```

### 2. Activate in Your IDE
<!-- VI: Bước 2 - Kích hoạt trong IDE -->

**Cursor / Antigravity:**
```
/start-session
```

**Claude Code:**
```
Read @CLAUDE.md and initialize the project context
```

**VSCode + Copilot/Gemini:**
```
@workspace Read GEMINI.md or COPILOT.md and initialize
```

### 3. Start Working
<!-- VI: Bước 3 - Bắt đầu làm việc -->

```
/assign backend "Create user authentication API"
/assign frontend "Build login page with Glassmorphism style"
/status
```

---

## 📁 Framework Structure

```
Agent_Coding/
├── .agent/                    # Agent definitions & workflows
│   ├── ORCHESTRATOR.instructions.md
│   ├── BOOTSTRAP.md          # First-run activation
│   ├── EMERGENCY_RCA.md      # Incident response
│   ├── agents/               # 19 specialized agents
│   ├── workflows/            # 10 workflow definitions
│   ├── meta/                 # Meta-programming capabilities
│   ├── modes/                # UltraThink, etc.
│   └── protocols/            # Research-first, etc.
├── .shared/                   # Shared context & knowledge
│   ├── context/              # Context management
│   ├── knowledge_base/       # Bugs, lessons, architecture
│   ├── tech_stacks/          # 3 stacks, 3 architectures
│   └── ui_ux_patterns/       # 57 styles, 95 palettes, 56 fonts
├── .windsurf/                 # Windsurf IDE config
├── .vscode/                   # VSCode config
├── docs/
│   └── playbook_vi/          # Vietnamese playbook + commands
├── CLAUDE.md                  # Claude instructions
├── GEMINI.md                  # Gemini instructions
├── COPILOT.md                 # Copilot instructions
├── PROJECT_CONTEXT.md         # Current project state
└── KANBAN.md                  # Kanban board view
```

---

## 🎯 Solving the Token Limit Problem

<!-- VI: Giải quyết bài toán hết token khi chuyển cửa sổ chat mới -->

When you approach token limits or start a new chat window:

1. **Before closing**: Run `/handover` to generate context summary
2. **New window**: Run `/start-session` to load context automatically
3. **Agent reads**: `PROJECT_CONTEXT.md` + `KANBAN.md` + recent changes

The AI will understand:
- ✅ What the project is about
- ✅ Current architecture & tech stack
- ✅ What has been completed
- ✅ What is in progress
- ✅ Past bugs and lessons learned
- ✅ Pending tasks

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Vietnamese Playbook](docs/playbook_vi/) | Hướng dẫn sử dụng đầy đủ tiếng Việt |
| [Tech Stack Catalog](.shared/tech_stacks/TECH_STACK_CATALOG.md) | Reference architectures & stacks |
| [Workflows](.agent/workflows/) | All workflow definitions |

---

## 🤝 Compatible Models

| Model | Recommended Use |
|-------|-----------------|
| **Claude Opus 4.5** | Architecture, complex planning |
| **Claude Sonnet 4.5** | Code implementation, debugging |
| **Gemini 3 Pro** | UI/UX design, vision tasks |
| **GPT Codex 5.2** | Code generation |
| **Grok** | General assistance |

---

## 📜 License

MIT License - Feel free to use in your projects.

---

**Made with ❤️ for the AI-assisted development community**
