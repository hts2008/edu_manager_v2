# 📚 COMMAND REFERENCE
<!-- VI: Tham chiếu tất cả các lệnh có sẵn trong Agent_Coding Framework -->

> **PURPOSE**: Complete command reference for all 50+ commands
> Bookmark this file for quick access

---

## 🚀 ORCHESTRATION COMMANDS

### Session Management
| Command | Description | Example |
|---------|-------------|---------|
| `/start-session` | Initialize new session, load context | `/start-session` |
| `/handover` | Generate handover document before closing | `/handover` |
| `/status` | Show current project status | `/status` |
| `/kanban` | Display Kanban board | `/kanban` |
| `/help` | Show all available commands | `/help` |
| `/context` | Show loaded context | `/context` |
| `/sync` | Force reload all context files | `/sync` |

### Agent Delegation
| Command | Description | Example |
|---------|-------------|---------|
| `/assign [agent] [task]` | Assign task to specific agent | `/assign backend "Create user API"` |
| `/switch [agent]` | Switch to agent role | `/switch frontend` |
| `/agents` | List all available agents | `/agents` |

---

## 👥 AGENT-SPECIFIC COMMANDS

### Architecture (`/architect`, `/a`)
| Command | Description |
|---------|-------------|
| `/architect design [feature]` | Design system architecture |
| `/architect review` | Review current architecture |
| `/architect adr [decision]` | Create Architecture Decision Record |
| `/architect techstack [req]` | Recommend tech stack |

### Tech Lead (`/techlead`, `/tl`)
| Command | Description |
|---------|-------------|
| `/techlead standards` | Show coding standards |
| `/techlead review [file]` | Code review specific file |
| `/techlead mentor [topic]` | Explain technical concept |

### Frontend (`/frontend`, `/fe`)
| Command | Description |
|---------|-------------|
| `/frontend component [name]` | Create React/Vue component |
| `/frontend page [name]` | Create new page |
| `/frontend style [component]` | Add styling |
| `/frontend hook [name]` | Create custom hook |

### Backend (`/backend`, `/be`)
| Command | Description |
|---------|-------------|
| `/backend api [endpoint]` | Create API endpoint |
| `/backend service [name]` | Create service layer |
| `/backend middleware [name]` | Create middleware |
| `/backend auth` | Implement authentication |

### Database (`/database`, `/db`)
| Command | Description |
|---------|-------------|
| `/database schema [model]` | Create/modify schema |
| `/database migrate` | Create migration |
| `/database seed` | Create seed data |
| `/database optimize [query]` | Optimize query |

### API Developer (`/api`)
| Command | Description |
|---------|-------------|
| `/api design [endpoint]` | Design API contract |
| `/api docs` | Generate OpenAPI docs |
| `/api version [strategy]` | Implement versioning |

### UI/UX (`/uiux`, `/design`)
| Command | Description |
|---------|-------------|
| `/design system` | Create design system |
| `/design style [type]` | Apply UI style (glassmorphism, brutalism, etc) |
| `/design palette [industry]` | Get color palette |
| `/design a11y` | Check accessibility |
| `/design:fast` | Quick UI generation |
| `/design:screenshot` | Analyze screenshot design |
| `/design:3d` | 3D/Claymorphism effects |

### Fix Commands (`/fix`) - ClaudeKit Style
| Command | Description |
|---------|-------------|
| `/fix [issue]` | General fix |
| `/fix:fast` | Quick fix, minimal changes |
| `/fix:hard` | Deep fix, refactor if needed |
| `/fix:ui` | Fix UI/styling issues |
| `/fix:types` | Fix TypeScript type errors |
| `/fix:logs` | Fix from error logs |
| `/fix:test` | Fix failing tests |
| `/fix:ci [url]` | Fix CI failures |
| `/fix:parallel` | Fix multiple issues in parallel |

### Git Commands (`/git`)
| Command | Description |
|---------|-------------|
| `/git:cm` | Commit with smart message |
| `/git:cp` | Commit and push |
| `/git:pr` | Create pull request |
| `/git:sync` | Pull and sync branches |
| `/git:merge [branch]` | Merge branch |

---

## 🛠️ DEVELOPMENT COMMANDS

### Planning
| Command | Description | Example |
|---------|-------------|---------|
| `/plan [feature]` | Create feature plan | `/plan user-authentication` |
| `/estimate [task]` | Estimate task effort | `/estimate login-page` |
| `/breakdown [feature]` | Break into subtasks | `/breakdown checkout-flow` |

### Coding
| Command | Description | Example |
|---------|-------------|---------|
| `/code [task]` | Implement feature | `/code login-form` |
| `/code:parallel [plan]` | Execute plan with parallel agents | `/code:parallel plan.md` |
| `/code:no-test` | Implement without tests | `/code:no-test quick-fix` |
| `/refactor [target]` | Refactor code | `/refactor auth-service` |
| `/optimize [file]` | Optimize performance | `/optimize user-list` |

### Cook Commands (v3.0)
| Command | Description | Example |
|---------|-------------|---------|
| `/cook [feature]` | Full feature workflow | `/cook "user profile page"` |
| `/cook:auto [feature]` | Auto implement without review | `/cook:auto "add dark mode"` |
| `/cook:auto:fast [feat]` | Skip research, fast implement | `/cook:auto:fast "button fix"` |
| `/cook:auto:parallel` | Parallel implementation | `/cook:auto:parallel "dashboard"` |

### Review
| Command | Description | Example |
|---------|-------------|---------|
| `/review` | Review recent changes | `/review` |
| `/review [file]` | Review specific file | `/review src/auth.ts` |
| `/review:codebase` | Full codebase review | `/review:codebase` |

---

## 🧪 QUALITY COMMANDS

### Testing
| Command | Description | Example |
|---------|-------------|---------|
| `/test [component]` | Generate tests | `/test auth-service` |
| `/test unit [file]` | Unit test specific file | `/test unit user.ts` |
| `/test e2e [flow]` | E2E test flow | `/test e2e login-flow` |
| `/coverage` | Check code coverage | `/coverage` |

### QA
| Command | Description | Example |
|---------|-------------|---------|
| `/qa [feature]` | QA testing | `/qa checkout` |
| `/qa regression` | Run regression tests | `/qa regression` |
| `/qa smoke` | Run smoke tests | `/qa smoke` |

### Debugging
| Command | Description | Example |
|---------|-------------|---------|
| `/debug [issue]` | Debug problem | `/debug login-error` |
| `/rca [bug-id]` | Root cause analysis | `/rca BUG-042` |
| `/fix-bug [bug-id]` | Fix specific bug | `/fix-bug BUG-042` |

---

## 🔒 SECURITY & PERFORMANCE

### Security
| Command | Description |
|---------|-------------|
| `/security-audit [target]` | Run security audit |
| `/security check [file]` | Check specific file |
| `/security owasp` | Check OWASP Top 10 |

### Performance
| Command | Description |
|---------|-------------|
| `/perf-check [target]` | Check performance |
| `/perf optimize [file]` | Optimize performance |
| `/perf cache [strategy]` | Implement caching |
| `/perf lighthouse` | Run Lighthouse audit |

---

## 🚀 DEPLOYMENT

| Command | Description | Example |
|---------|-------------|---------|
| `/deploy staging` | Deploy to staging | `/deploy staging` |
| `/deploy production` | Deploy to production | `/deploy production` |
| `/rollback [version]` | Rollback to version | `/rollback v1.2.3` |
| `/release [type]` | Create release | `/release patch` |

---

## 📊 PROJECT MANAGEMENT

| Command | Description | Example |
|---------|-------------|---------|
| `/sprint status` | Sprint status | `/sprint status` |
| `/sprint plan` | Plan sprint | `/sprint plan` |
| `/task create [title]` | Create task | `/task create "Add login"` |
| `/task move [id] [column]` | Move task | `/task move TASK-42 done` |
| `/blocker [id] [reason]` | Mark blocker | `/blocker TASK-42 "Waiting API"` |

---

## 🔮 META COMMANDS (v3.0)

| Command | Description | Example |
|---------|-------------|---------|
| `/meta:skill [name] [desc]` | Generate new skill | `/meta:skill strict-review "Code review with 100% coverage"` |
| `/meta:agent [name] [desc]` | Generate new agent | `/meta:agent devrel "Developer Relations"` |
| `/meta:workflow [name] [desc]` | Generate new workflow | `/meta:workflow onboarding "New dev onboarding"` |
| `/meta:template [type]` | Show template | `/meta:template agent` |
| `/meta:validate [file]` | Validate against standards | `/meta:validate myagent.md` |

---

## 🧠 ULTRATHINK MODE (v3.0)

| Command | Description |
|---------|-------------|
| `/ultrathink [problem]` | Activate deep reasoning mode |
| `#ultrathink` | Tag to enable UltraThink in prompt |

**UltraThink Process**:
1. Question every assumption
2. Obsess over details
3. Plan like Da Vinci
4. Craft, don't code
5. Iterate relentlessly
6. Simplify ruthlessly

| Command | Description |
|---------|-------------|
| `/ultrathink [problem]` | Full deep reasoning |
| `/ultrathink:plan [feature]` | Deep planning |
| `/ultrathink:review [code]` | Craftsman review |
| `/ultrathink:debug [issue]` | Systematic debugging |

---

## ⛓️ WORKFLOW CHAINS (v3.0)

| Command | Description |
|---------|-------------|
| `/chain feature [desc]` | Feature development chain |
| `/chain fix [bug]` | Bug fix chain |
| `/chain deploy [env]` | Deployment chain |
| `/chain:create [name]` | Create custom chain |
| `/chain:list` | List all chains |
| `/chain:pause` | Pause current chain |
| `/chain:resume` | Resume paused chain |
| `/chain:abort` | Abort chain |

---

## 🎯 QUICK COMMANDS (v3.0)

| Command | Description |
|---------|-------------|
| `/ask [question]` | Technical Q&A |
| `/brainstorm [topic]` | Creative ideation with YAGNI/KISS/DRY |
| `/scout [query]` | Search codebase for files |
| `/docs:init` | Initialize documentation |
| `/docs:update [feature]` | Update docs |
| `/docs:summarize` | Summarize recent changes |
| `/yolo` | Execute without confirmation |
| `/resume` | Resume previous session |

---

## 🔍 RESEARCH COMMANDS (v3.0)

### GitHub Search
| Command | Description |
|---------|-------------|
| `/search:github [query]` | Search repositories |
| `/search:github:code [query]` | Search code snippets |
| `/search:github:issues [query]` | Search issues |

### Stack Overflow Search
| Command | Description |
|---------|-------------|
| `/search:stackoverflow [query]` | Search Q&A |
| `/search:so [query]` | Shorthand |

### Package Search
| Command | Description |
|---------|-------------|
| `/search:npm [package]` | Search npm |
| `/search:pypi [package]` | Search PyPI |

### Documentation Search
| Command | Description |
|---------|-------------|
| `/search:docs [framework] [topic]` | Official docs |
| `/search:mdn [api]` | MDN Web Docs |

---

## 🆘 EMERGENCY

| Command | Description |
|---------|-------------|
| `/emergency [description]` | Start emergency protocol |
| `/incident-status` | Check incident status |
| `/rollback [version]` | Immediate rollback |

---

## 💡 SHORTCUTS

| Long Form | Shortcut |
|-----------|----------|
| `/orchestrator` | `/o` |
| `/architect` | `/a` |
| `/frontend` | `/fe` |
| `/backend` | `/be` |
| `/database` | `/db` |
| `/techlead` | `/tl` |
| `/security` | `/sec` |
| `/performance` | `/perf` |

---

## 📝 COMMAND SYNTAX

```
/command [required] {optional} --flag value

Examples:
/assign backend "Create user API"
/deploy staging --skip-tests
/test unit src/auth.ts --coverage
```

---

**Version**: 3.0
**Total Commands**: 80+
**Last Updated**: 2026-01-04
