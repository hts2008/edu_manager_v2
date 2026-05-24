# AGENTS.md — Cross-Tool Agent Briefing

> **Version**: 4.5 · Universal AI Coding · Tool-neutral
>
> Standard: This file follows the AGENTS.md convention recognized by OpenAI Codex CLI, Claude Code, Cursor, VS Code Copilot, and Gemini/Antigravity. It provides any AI tool with the minimum context needed to understand this workspace's agent-based architecture.

## Three Sources of Truth
1. **Operational Truth** — `KANBAN.md` (project state)
2. **Cognitive Truth** — `memory/` + `GEMINI.md` (technical knowledge)
3. **Evidence Truth** — `receipts/` + `docs/artifacts/` (proof of work)

## Reading Order (Session Start)
1. `KANBAN.md` → current sprint, active tasks, blockers
2. `memory/memory-bank/activeContext.md` → current technical state
3. `memory/memory-bank/progress.md` → last 5 entries
4. `memory/memory-bank/decisionLog.md` → architecture decisions
5. `GEMINI.md` → full operating doctrine (detailed runtime brain)

## Build & Test Commands
```bash
# No compile step — this is a framework of .md/.yaml files
# Validation:
pwsh scripts/start-infrastructure.ps1  # Start NM + Ollama + Dashboard
pwsh scripts/sync-mcp-config.ps1       # Sync .mcp.json → per-IDE configs
```

## Agent Catalog (23 Agents)

### Core Agents (20)
| Agent | Domain | Risk | Review Mode |
|-------|--------|------|-------------|
| orchestrator | Task routing, coordination | — | self-check |
| project-planner | Planning, decomposition | medium | paired |
| product-manager | Requirements, specs | medium | paired |
| product-owner | Backlog, MVP, strategy | medium | self-check |
| frontend-specialist | UI, web, accessibility | medium | paired |
| backend-specialist | API, services, domain logic | medium | paired |
| database-architect | Schema, migrations, query | high | adversarial |
| mobile-developer | Mobile apps | medium | paired |
| game-developer | Game logic | medium | paired |
| devops-engineer | CI/CD, cloud, deploy | high | paired |
| security-auditor | Security review | high | adversarial |
| penetration-tester | Offensive testing | high | adversarial |
| test-engineer | Test strategy | medium | self-check |
| qa-automation-engineer | E2E, automation | medium | self-check |
| debugger | Root cause analysis | medium | self-check |
| performance-optimizer | Perf bottlenecks | medium | paired |
| seo-specialist | SEO optimization | low | self-check |
| documentation-writer | Docs, handoff | low | self-check |
| code-archaeologist | Legacy code, refactor | medium | paired |
| explorer-agent | Exploration, discovery | low | self-check |

### Platform Agents (3)
| Agent | Domain | Risk | Review Mode |
|-------|--------|------|-------------|
| judge-agent | Independent review | medium | adversarial |
| memory-curator | Memory hygiene | low | self-check |
| release-manager | Release readiness | high | adversarial |

## Conventions
- Canonical agent definitions: `agents/<agent-name>.md`
- Agent registry: `agents/registry.yaml`
- Each agent has: mission, inputs, workflow links, outputs, Definition of Done
- Full contracts at `agents/<agent-name>.md`

## Slash Commands (22)
```
/pm /brainstorm /plan /create /enhance /debug /test /review /deploy
/preview /status /orchestrate /ui-ux-pro-max /security-audit
/refactor /document /spec /build-feature /fix-issue /handoff
/start-session /session-close /deep-sync /consolidate
```
- `/pm` is the default entry point for free-form development requests
- `/orchestrate` is legacy alias → auto-redirects to `/pm`
- `/deep-sync` is the mega audit: codebase scan → KANBAN/memory cross-reference → NM/C+ sync

## CLI Subagent Routing

Antigravity is the **PM coordinator** (planning, routing, context, QA/QC). CLIs are **execution workers**.

**Spawn script**: `scripts/cli-spawn.ps1` — full skill doc: `skills/cli-orchestration/SKILL.md`

### Task→CLI Routing Matrix

| Task Type | CLI | Model (Primary → Fallback) | Thinking Capture |
|-----------|-----|---------------------------|-----------------|
| **Coding** (create, refactor, architecture) | Claude Code | `claude-opus-4-6` → `claude-sonnet-4-6` | `--output-format stream-json --verbose` |
| **QA/QC** (debug, review, test, verify) | Codex CLI | `gpt-5.4` (xhigh) → `codex-5.3` (high) | `--json -c model_reasoning_summary=detailed` |
| **Frontend/UI** (ui-ux, design, CSS) | Gemini CLI | `gemini-3.1-pro-preview` | `--output-format stream-json` |
| **Other** | Antigravity native | — | — |

### Quota Fallback (MANDATORY)

```
CLI quota exhausted → Antigravity role-switch (execute task inline)
NEVER cross-CLI fallback:
  ❌ Claude quota → NEVER delegate coding to Codex/Gemini
  ❌ Codex quota → NEVER delegate QA to Claude/Gemini
  ❌ Gemini quota → NEVER delegate UI to Claude/Codex
```

### Exit Codes

| Code | Meaning | PM Action |
|------|---------|-----------|
| 0 | Success | Read log, integrate results |
| 2 | Quota exhausted | **Antigravity role-switch** |
| 3 | Timeout | Decompose, retry smaller |
| 4 | CLI not found | Execute inline |

## Key Rules (All Agents Must Follow)
1. Test before code (TDD) — Red → Green → Refactor
2. No mock data in production
3. No "done" without evidence (test output, screenshots, diffs)
4. Atomic tasks — ≤1 feature per task, ≤1 logical change per commit
5. Update memory + KANBAN after every task
6. 3 strikes = stop and escalate
7. Protect working code — no pointless refactoring
8. No unauthorized dependency installs
9. No reversing past decisions without evidence + log update
10. All changes have evidence
11. No skipping Dual-Brain (NM/C+) — if available, agents MUST interact every session + every chat turn. Zero-tool-call = violation.

## Anti-Patterns (Forbidden)
- Foundation-only code (UI looks good but doesn't work end-to-end)
- Silent failure (empty catch blocks)
- Optimistic coding (no timeout, retry, fallback)
- God component (>300 LOC file, >50 LOC function)
- Copy-paste (same logic >2 times → extract)
- Console.log debugging (use structured logging)
- TODO LATER without tracked KANBAN task

## Verification Gates
11 quality gates in `manifests/quality-gates.yaml`. Must pass before "done":
- LOW risk: lint, type-check, unit tests
- MEDIUM risk: + integration tests, memory update check
- HIGH risk: + security scan, judge-agent review

## Dual-Brain Memory Ecosystem (V4.5)

### Neural Memory (NM)
- **Purpose**: Persistent cross-session semantic memory
- **MCP server**: `neural-memory` (stdio transport)
- **Dashboard**: `http://localhost:52836` (NM Web UI)
- **Core tools**: `nmem_recall`, `nmem_remember`, `nmem_consolidate`, `nmem_health`
- **Protocol**: Recall at session start → Store insights after tasks → Consolidate periodically
- **Proactive Rule**: Agent MUST call NM tools every session. Zero-call sessions = Rule 11 violation.

### 🚨 CRITICAL: Neural Memory Brain Routing (V4.8.1)

> **SOLVED via MCPProxy Per-Brain Isolation + Config Disablement.**
> Each brain has a dedicated MCPProxy upstream instance. Non-default workspaces
> have `"disabled": true` on the `neural-memory` entry in `.mcp.json`, which
> removes direct `nmem_*` tools from the AI palette entirely.

**2-TIER ROUTING RULE:**

1. **MCPProxy (primary)**: `mcp_MCPProxy_call_tool_read(name="neural-memory-[BRAIN]:nmem_*")`
   - ALL non-default workspaces MUST use this — direct `nmem_*` tools are disabled
   - Brain is verified on first call — reported brain MUST match expected
2. **Direct MCP**: `nmem_*` tools directly — ONLY available in `default` brain workspaces (UAIC, UAIC_PROD)

**EDU_MANAGER_V2 MCPProxy route:**
- `neural-memory-default` → select the `edu_manager` brain for this workspace.
- Do not route EDU_MANAGER_V2 to any other MCPProxy upstream or Neural Memory brain.

**Config enforcement (`.mcp.json`):**
- Non-default workspaces: `"neural-memory": { "disabled": true }` → no direct `nmem_*` tools
- Default workspaces: `"neural-memory": { "disabled": false }` → direct `nmem_*` available

**FORBIDDEN — agents must NEVER do these:**
- ❌ Call `nmem_health` MCP tool then say "mismatch detected, but proceeding with default"
- ❌ Reference DEC-017, DEC-029, or any past decision to justify using `default`
- ❌ Say "all memories are in default anyway" or "data was seeded into default"
- ❌ Say "known issue" and continue on wrong brain
- ❌ Call direct `nmem_*` tools when workspace brain ≠ `default`
- ❌ Re-enable `"disabled": false` in `.mcp.json` for non-default workspaces

**REQUIRED — correct behavior:**
- ✅ Use MCPProxy routing: `neural-memory-[BRAIN]:nmem_health`
- ✅ Verify reported brain matches expected brain on first call
- ✅ If direct `nmem_*` tools are available AND brain ≠ default → HALT, something is misconfigured

### Proactive MCP Usage Protocol (V4.5 — KAIROS-Inspired)

All agents MUST follow these IF/THEN trigger rules:

| Trigger | Required Action |
|---------|----------------|
| Session start | `nmem_recall` + `nmem_session` + `get_context_tree` (parallel) |
| Each chat turn | `nmem_recall` if request references past decisions/errors |
| Task complete | `nmem_remember(type=decision\|error\|insight)` + POST-TASK CONSOLIDATION (two-tier) |
| Before code edit (risk≥MEDIUM) | `get_blast_radius(symbol)` |
| Before code search | `semantic_code_search` BEFORE grep |
| Session end | `nmem_consolidate` + `nmem_health` + `nmem_tool_stats` |
| Every 3 tasks | `nmem_health(compact=true)` — consolidate if grade drops |

**Post-Task Consolidation (Two-Tier)**: After each task completion:
- Tier 1 (enrich, <1s): when risk≥MED or tasks since last consolidation ≥2
- Tier 2 (all, 5-30s): when session ending, tasks≥3, or grade<B
- Skip if last consolidation was <2 min ago. Timeout 30s. Never block delivery.

**Three-Gate Consolidation**: Any 2 of [≥2h since last, ≥3 tasks done, grade<B] → auto-consolidate.

**Session Handoff MUST include**: NM call count, C+ call count, brain health grade.

### Context+ (C+)
- **Purpose**: Semantic code intelligence (search, structure, blast radius)
- **MCP server**: `context-plus` (stdio, uses local Ollama embeddings)
- **Core tools**: `get_context_tree`, `semantic_code_search`, `get_blast_radius`, `get_file_skeleton`
- **Protocol**: Tree first → Semantic search → Blast radius before edits

### Brain Dashboard (Unified Observability)
- **URL**: `http://localhost:3333`
- **Panels**: NM Health, NM Stats, Tool Usage, C+ Activity
- **API endpoints**: `/nm-api/health`, `/nm-api/stats`, `/cp-api/snapshot`

### Infrastructure
- **Auto-start**: `scripts/start-infrastructure.ps1` (launches NM, Ollama, Dashboard)
- **MCP Config**: `.mcp.json` at workspace root (source of truth)
- **Per-IDE MCP**: `.cursor/mcp.json`, `.vscode/mcp.json` (synced copies)

## Paperclip Orchestration (V4.6 — Optional Control Plane)

When Paperclip AI is active, it serves as the company-level control plane:
- **Paperclip** = Control Plane (goals, org chart, budget, task dispatch)
- **UAIC** = Execution Plane (coding doctrine, memory, skills, quality gates)

### Integration Protocol
| Step | Agent Action |
|------|-------------|
| Session start | Check `localhost:3100/api/health` (3s timeout) |
| Paperclip active | Fetch assigned tasks from Paperclip Issues API |
| Task execution | Follow UAIC doctrine (13-step model) with Paperclip task as input |
| Task complete | Report evidence + cost to Paperclip, then update KANBAN |
| Paperclip offline | Fall back to KANBAN.md — no errors, no retries |

### Key Rules
- Always checkout task atomically before work (prevents duplicate effort)
- Always report cost events (budget tracking is Paperclip's core value)
- Always follow UAIC quality gates regardless of Paperclip deadline pressure
- Never block on Paperclip — graceful degradation to KANBAN mode

### Commands
- `/paperclip status` — company dashboard
- `/paperclip tasks` — assigned tasks
- `/paperclip checkout <id>` — lock task
- `/paperclip complete <id>` — mark done with evidence
- Full reference: `skills/paperclip-orchestration/SKILL.md`

## Cross-IDE Configuration

| IDE | Brain File | MCP Config | Config Dir | Status |
|-----|-----------|------------|------------|--------|
| Antigravity (Gemini) | `GEMINI.md` | `.mcp.json` | `.gemini/` | ✅ Full |
| Claude Code | `CLAUDE.md` | `.mcp.json` | `.claude/` | ✅ Full |
| Codex CLI | `AGENTS.md` (this file) | `.mcp.json` | `.codex/` | ✅ Full |
| VS Code Copilot | `.github/copilot-instructions.md` | `.vscode/mcp.json` | `.github/` | ✅ Full |
| Cursor | `.cursorrules` + `.cursor/rules/*.mdc` | `.cursor/mcp.json` | `.cursor/` | ✅ Full |

### MCP Config Sync
Source of truth: `.mcp.json` (root). Run `scripts/sync-mcp-config.ps1` after edits.

## Memory Write-Back Protocol (After Every Task)
1. `activeContext.md` → update current state
2. `progress.md` → append entry (NEVER overwrite)
3. `decisionLog.md` → if architecture decision made
4. `brain/*` → if pattern/error/insight learned
5. `current-session.md` → update session state
6. `KANBAN.md` → update task status + evidence links
7. `receipts/` → emit verification receipt
8. `nmem_remember` → store decisions/errors/insights to Neural Memory (V4.1)
9. `nmem_session(action="set", progress=X)` → update session progress (V4.1)

## Directory Structure (Quick Reference)
```
├── agents/          # 23 agent contracts + registry.yaml
├── commands/        # 23 slash commands
├── workflows/       # 21 workflow procedures
├── skills/          # 108 skills (20 categories × sub-skills)
├── rules/           # 12 coding rule modules
├── policies/        # 11 governance policies
├── manifests/       # 11 YAML config files
├── memory/          # Memory fabric (bank + brain + events + graph)
├── receipts/        # Evidence ledger
├── templates/       # 9 project templates
├── scripts/         # Infrastructure scripts
├── tools/           # Dashboard, utilities
├── docs/            # Documentation artifacts
└── reports/         # Audit and analysis reports
```
