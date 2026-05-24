# CLAUDE.md — Claude Code Runtime Briefing

> **Version**: 4.5 · Universal AI Coding · Workspace-scoped

## Identity
You are operating in a workspace with **Universal AI Coding V4.5** installed. This is an AI Engineering Operating System that provides structured agents, workflows, skills, rules, memory, and verification gates.

## Workspace Project
- **Name**: EDU_MANAGER_V2
- **Domain**: Production education management system for classes, students, parents, teachers, attendance, receipts, payments, reports, and templates.
- **Stack**: Vite + React 19, Tailwind CSS v4, TypeScript/JavaScript, Prisma 5, Vercel Serverless Functions, Playwright.
- **Database/storage**: Neon Postgres production with Vercel Blob; SQLite/Express is reference-only local parity.
- **Neural Memory brain**: `edu_manager` only. Use MCPProxy upstream `neural-memory-default` at `http://127.0.0.1:8080/ui/servers/neural-memory-default`; inside that upstream, select only `edu_manager` and never use direct non-default NM tools.

## Three Sources of Truth
1. **Operational** → `KANBAN.md` (what's being done)
2. **Cognitive** → `memory/` + `GEMINI.md` (what's known)
3. **Evidence** → `receipts/` + `docs/artifacts/` (what's proven)

## Reading Order (Session Start)
1. `KANBAN.md` — current sprint, active tasks, blockers
2. `memory/memory-bank/activeContext.md` — current technical state
3. `memory/memory-bank/progress.md` — last 5 entries
4. `memory/memory-bank/decisionLog.md` — architecture decisions
5. `memory/sessions/current-session.md` — session continuity

## Canonical Folders
| Folder | Contents | Count |
|--------|----------|-------|
| `agents/` | Specialist agents with contracts | 23 |
| `commands/` | Entrypoint slash commands | 22 |
| `workflows/` | Procedure workflows | 17 |
| `skills/` | Skills across 20 categories | 108 |
| `rules/` | Coding rules | 12 |
| `policies/` | Governance policies | 11 |
| `memory/` | Memory fabric (bank + brain + events + graph) | — |
| `manifests/` | YAML configuration files | 11 |
| `receipts/` | Evidence ledger | — |
| `tools/` | Infrastructure tooling (dashboard) | — |

## Dual-Brain Memory System (V4.5)

### Neural Memory (NM)
- **MCP server**: `neural-memory` (stdio, port 52836 web UI)
- **Purpose**: Persistent cross-session memory with semantic recall
- **Key tools**: `nmem_recall`, `nmem_remember`, `nmem_consolidate`, `nmem_health`
- **Usage**: Recall at session start, store decisions/insights after tasks
- **MANDATORY**: Agent MUST call NM tools every session. Zero calls = Rule 11 violation.

### Proactive MCP Usage (V4.5 — KAIROS-Inspired)
All agents MUST follow these trigger rules:
- **Session start**: `nmem_recall` + `nmem_session` + `get_context_tree` (parallel)
- **Each chat turn**: `nmem_recall` if request references past decisions/errors
- **Task complete**: `nmem_remember(type=decision|error|insight)` + POST-TASK CONSOLIDATION (two-tier)
- **Before code edit (risk≥MEDIUM)**: `get_blast_radius(symbol)`
- **Before code search**: `semantic_code_search` BEFORE grep
- **Session end**: `nmem_consolidate` + `nmem_health` + `nmem_tool_stats`
- **Every 3 tasks**: `nmem_health(compact=true)` — consolidate if grade drops
- **Three-Gate**: Any 2 of [≥2h since last, ≥3 tasks done, grade<B] → auto-consolidate
- **Post-Task Consolidation**: Tier 1 (enrich, <1s) when risk≥MED or tasks≥2; Tier 2 (all) when session ending, tasks≥3, or grade<B. Skip if <2min since last. Timeout 30s. Never block delivery.
- **Session handoff MUST include**: NM call count, C+ call count, brain health grade

### Context+ (C+)
- **MCP server**: `context-plus` using local Ollama embeddings
- **Purpose**: Semantic code search, blast radius analysis, project structure
- **Key tools**: `get_context_tree`, `semantic_code_search`, `get_blast_radius`, `get_file_skeleton`
- **Usage priority**: `get_context_tree` → `semantic_code_search` → `get_blast_radius`

### Brain Dashboard
- **URL**: `http://localhost:3333`
- **Purpose**: Unified observability — NM health, stats, tool usage, C+ activity
- **API**: `/nm-api/health`, `/nm-api/stats`, `/cp-api/snapshot` (POST/GET)

## MCP Configuration
- **Config file**: `.mcp.json` at workspace root (source of truth)
- **MCP Proxy**: Port 8080 (aggregates all MCP servers)
- **Infrastructure auto-start**: `scripts/start-infrastructure.ps1`

## Rules (Must Follow)
1. Test before code (TDD) — Red → Green → Refactor
2. No mock data in production
3. No "done" without evidence (test output, screenshots, diffs)
4. Atomic tasks only (≤1 feature per task)
5. Update memory + KANBAN after every task
6. 3 strikes = stop and escalate
7. No reversing decisions without evidence + log update
8. Protect working code — no pointless refactoring
9. No unauthorized dependency installs
10. All changes have evidence

## Verification Gates
11 quality gates must pass before claiming "done". See `manifests/quality-gates.yaml`.
- LOW risk: lint, type-check, unit tests
- MEDIUM risk: + integration tests, memory update check
- HIGH risk: + security scan, judge-agent review

## Memory Write-Back (After Task)
1. activeContext.md → update current state
2. progress.md → append entry (NEVER overwrite)
3. decisionLog.md → if architecture decision made
4. brain/* → if pattern/error/insight learned
5. session files → update current-session.md
6. KANBAN.md → task status + evidence links
7. receipts/ → emit receipt
8. artifact summary

## Anti-Patterns (Forbidden)
- Foundation-only code (looks good but doesn't work end-to-end)
- Silent failure (empty catch blocks)
- Optimistic coding (no timeout/retry/fallback)
- God component (>300 LOC file, >50 LOC function)
- Copy-paste (same logic >2 times → extract)
- Console.log debugging (use structured logging)
- TODO LATER without task tracking

## Agent Routing (Quick Reference)
| Need | Agent |
|------|-------|
| Free-form dev request | `orchestrator` via `/pm` |
| UI/Web | `frontend-specialist` |
| API/Services | `backend-specialist` |
| Schema/DB | `database-architect` |
| CI/CD/Deploy | `devops-engineer` |
| Security audit | `security-auditor` |
| Debug/RCA | `debugger` |
| Docs/Handoff | `documentation-writer` |
| Test strategy | `test-engineer` |
| Independent review | `judge-agent` |
| Planning | `project-planner` |
| Performance | `performance-optimizer` |

## Slash Commands
```
/pm /brainstorm /plan /create /enhance /debug /test /review /deploy
/preview /status /orchestrate /ui-ux-pro-max /security-audit
/refactor /document /spec /build-feature /fix-issue /handoff
/start-session /session-close /paperclip
```

## Paperclip Orchestration (V4.6 — Optional)
When Paperclip AI is active (`localhost:3100`), it serves as company-level control plane:
- **Session start**: Check `GET /api/health` (3s timeout) → active or offline
- **Active**: Fetch assigned tasks, execute with UAIC doctrine, report cost/evidence
- **Offline**: Fall back to KANBAN.md — no errors, no retries
- **Commands**: `/paperclip status|tasks|checkout|complete|report-cost|setup|health`
- **Reference**: `skills/paperclip-orchestration/SKILL.md`, `GEMINI.md §XXIII`

## Cross-IDE Awareness
This workspace supports multiple AI IDEs simultaneously:
- **Antigravity**: `GEMINI.md` (full brain)
- **Claude Code**: `CLAUDE.md` (this file)
- **Codex CLI**: `AGENTS.md` + `CODEX.md`
- **VS Code Copilot**: `.github/copilot-instructions.md`
- **Cursor**: `.cursorrules` + `.cursor/rules/*.mdc`

All share the same `.mcp.json`, `memory/`, `KANBAN.md`, and `receipts/`.
