---
name: paperclip-orchestration
description: Integration with Paperclip AI — the open-source control plane for autonomous AI companies
---

# Paperclip Orchestration Skill

## When to Use

Use this skill when:
- Working within a workspace orchestrated by Paperclip (heartbeat-driven execution)
- Setting up a new Paperclip company with UAIC-powered agents
- Reporting task completion, cost events, or agent status to Paperclip
- Bridging UAIC's workspace intelligence with Paperclip's company-level coordination

## What is Paperclip?

Paperclip is the **control plane for autonomous AI companies**. It provides:
- **Company-as-first-class-object** — goals, org charts, budgets, governance
- **Agent-as-employee** — each agent has a role, adapter config, reporting chain
- **Heartbeat execution** — Paperclip schedules agent invocations on a cadence
- **Task hierarchy** — all work traces back to the company's top-level goal
- **Budget enforcement** — token spend tracking with hard cost limits
- **Board governance** — human approvals for hiring, strategy, firing

**Paperclip ≠ UAIC**. They are complementary:

| Paperclip (Control Plane) | UAIC (Execution Plane) |
|--------------------------|----------------------|
| WHAT to do (goals, tasks) | HOW to do it (doctrine, patterns) |
| WHO does it (org chart) | WHICH skills to use (108+ skills) |
| HOW MUCH it costs (budget) | WHAT to remember (Neural Memory) |
| Company-level orchestration | Workspace-level intelligence |

## Architecture

```
┌─ Paperclip Server (localhost:3100) ──────────────┐
│  Company → Goals → Issues → Agent Registry       │
│  Budget → Cost Events → Heartbeat Scheduler      │
│  Board → Approvals → Activity Log               │
└─────────────────┬────────────────────────────────┘
                  │ Heartbeat invocation
                  ▼
┌─ UAIC Workspace ────────────────────────────────┐
│  Doctrine (GEMINI.md) → Agents → Skills → Rules │
│  Neural Memory (cross-session) → Context+ (code) │
│  Quality Gates → Evidence → Receipts             │
└──────────────────────────────────────────────────┘
```

## Paperclip Adapters

Paperclip ships adapters for major AI coding tools:

| Adapter | Runtime | UAIC Compatible |
|---------|---------|-----------------|
| `gemini-local` | Google Gemini CLI | ✅ Primary |
| `claude-local` | Anthropic Claude Code | ✅ Full |
| `codex-local` | OpenAI Codex CLI | ✅ Full |
| `cursor-local` | Cursor IDE | ✅ Full |
| `opencode-local` | OpenCode CLI | ✅ Compatible |
| `openclaw-gateway` | OpenClaw HTTP | ⚡ Via webhook |
| `pi-local` | Pi AI | ⚡ Via webhook |

## Agent Heartbeat Protocol

When Paperclip invokes a UAIC agent via heartbeat:

### 1. Receive Heartbeat
Paperclip spawns the agent process with:
- Company context (goal, current state)
- Agent identity (role, capabilities, budget remaining)
- Assigned issues (tasks to work on)

### 2. Check & Checkout Task
```
GET /api/companies/:companyId/issues?assignee=:agentId&status=open
→ Returns list of assigned issues

POST /api/issues/:issueId/checkout
→ Atomic lock — prevents other agents from taking same task
→ Returns 409 if already checked out
```

### 3. Execute with UAIC Doctrine
The agent follows UAIC's execution model (PHẦN IV of GEMINI.md):
1. LOAD OPERATIONAL TRUTH (Paperclip task = the assignment)
2. LOAD COGNITIVE TRUTH (memory + doctrine)
3. LOAD DUAL-BRAIN (NM recall + C+ context)
4. UNDERSTAND → INSPECT → CLASSIFY → ROUTE
5. EXECUTE (using UAIC skills, rules, quality gates)
6. VERIFY (run quality gates)
7. RECORD (memory + evidence)

### 4. Report Results
```
POST /api/issues/:issueId/comments
Body: { content: "Task completed. Evidence: [links]. Tests: [results]." }

PATCH /api/issues/:issueId
Body: { status: "done" }
```

### 5. Report Cost
```
POST /api/companies/:companyId/cost-events
Body: {
  agent_id: ":agentId",
  amount_cents: <calculated>,
  description: "Task T-XXX execution",
  metadata: { tokens_used: N, model: "gemini-2.0-flash" }
}
```

### 6. Release Task
```
POST /api/issues/:issueId/release
→ Unlocks the atomic checkout
```

## Key API Endpoints

| Action | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| Health check | GET | `/api/health` | Verify Paperclip is running |
| List companies | GET | `/api/companies` | Get all companies |
| Get company | GET | `/api/companies/:id` | Company details + goal |
| List issues | GET | `/api/companies/:cid/issues` | Filter: `?assignee=X&status=open` |
| Checkout issue | POST | `/api/issues/:id/checkout` | Atomic lock |
| Update issue | PATCH | `/api/issues/:id` | Status, priority, etc. |
| Add comment | POST | `/api/issues/:id/comments` | Progress updates |
| Complete issue | PATCH | `/api/issues/:id` | `{ status: "done" }` |
| Release issue | POST | `/api/issues/:id/release` | Unlock checkout |
| Report cost | POST | `/api/companies/:cid/cost-events` | Token spend |
| Get budget | GET | `/api/companies/:cid/budget` | Remaining budget |
| Agent heartbeat | POST | `/api/agents/:id/heartbeat` | Status report |

## UAIC ↔ Paperclip Mapping

| UAIC Concept | Paperclip Equivalent | Interaction |
|-------------|---------------------|-------------|
| KANBAN.md tasks | Paperclip Issues | Paperclip is primary when active |
| `/pm` routing | Agent heartbeat dispatch | Paperclip triggers, UAIC executes |
| Quality Gates | Task completion criteria | UAIC gates run before Paperclip complete |
| Memory records | Cost events + Activity log | Both systems updated |
| Session handoff | Heartbeat status report | Agent reports status to both |
| Evidence receipts | Issue comments | Evidence posted as Paperclip comments |

## Configuration

### Environment Variables
```
PAPERCLIP_HOME=~/.paperclip          # Paperclip data directory
PAPERCLIP_API_URL=http://localhost:3100  # Paperclip server URL
PAPERCLIP_INSTANCE_ID=default        # Instance identifier
PAPERCLIP_AGENT_ID=<agent-uuid>      # This agent's ID in Paperclip
PAPERCLIP_COMPANY_ID=<company-uuid>  # Active company ID
```

### Isolation (per DEC-017)
- Paperclip data: `~/.paperclip/instances/<id>/db` (embedded PostgreSQL)
- Neural Memory: `~/.neuralmemory/brains/<project>.db` (SQLite)
- Context+: Workspace-local `.mcp_data/` (auto-cleaned on export)
- **No cross-contamination** — each system uses separate storage

## Graceful Degradation

If Paperclip server is not reachable (`localhost:3100`):
1. **Skip all Paperclip API calls** — no errors, no retries
2. **Fall back to KANBAN.md** as task source
3. **Log degradation** in session report: "Paperclip: offline — using KANBAN mode"
4. **Never block** session start or task execution due to Paperclip unavailability

## Installation

```bash
# Install Paperclip globally
npx paperclipai onboard --yes

# Start Paperclip server
cd ~/.paperclip/instances/default
pnpm dev

# Verify
curl http://localhost:3100/api/health
```

## References

- [Paperclip GitHub](https://github.com/paperclipai/paperclip)
- [Paperclip Docs](https://docs.paperclip.dev)
- [UAIC GEMINI.md §23](../../../GEMINI.md) — Paperclip Integration Protocol
- [UAIC AGENTS.md](../../../AGENTS.md) — Cross-tool agent briefing
