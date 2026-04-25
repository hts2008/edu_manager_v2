# Company Setup Guide

> How to set up a Paperclip company with UAIC-powered agents.

## Prerequisites

- Node.js 20+ installed
- UAIC workspace at project root (GEMINI.md, KANBAN.md, etc.)
- MCP servers configured (`.mcp.json` with Neural Memory + Context+)

## Step 1: Install Paperclip

```bash
# One-line install
npx paperclipai onboard --yes

# Verify installation
curl http://localhost:3100/api/health
```

This creates:
- `~/.paperclip/instances/default/` — data directory
- Embedded PostgreSQL database
- Default server config

## Step 2: Start Paperclip Server

```bash
# Start in development mode
cd ~/.paperclip/instances/default
pnpm dev

# Server runs at http://localhost:3100
# UI available at http://localhost:3100 (React board)
```

## Step 3: Create a Company

Using the Paperclip UI or API:

```http
POST http://localhost:3100/api/companies
Content-Type: application/json

{
  "name": "My AI Company",
  "goal": "Build and ship [product description] within [timeframe]",
  "budget_cents": 100000
}
```

## Step 4: Define CEO Agent

```http
POST http://localhost:3100/api/companies/:companyId/agents
Content-Type: application/json

{
  "name": "CEO",
  "adapter": "gemini-local",
  "role": "Chief Executive Officer",
  "capabilities": "Strategic planning, task decomposition, team coordination, progress review",
  "reports_to": null,
  "config": {
    "heartbeat_instruction": "Review company metrics. Check executive reports. Identify blockers. Assign new strategic initiatives. Reprioritize if needed.",
    "workspace_path": "/path/to/project",
    "brain_file": "GEMINI.md"
  },
  "budget_cents": 25000,
  "heartbeat_interval_seconds": 300
}
```

## Step 5: Build Org Chart

### CTO (reports to CEO)
```json
{
  "name": "CTO",
  "adapter": "gemini-local",
  "role": "Chief Technology Officer",
  "capabilities": "Architecture decisions, tech stack selection, code review, engineering standards",
  "reports_to": "agent_ceo_id",
  "config": {
    "heartbeat_instruction": "Check assigned technical tasks. Review engineer output. Make architecture decisions. Ensure code quality.",
    "workspace_path": "/path/to/project"
  }
}
```

### Engineers (report to CTO)
```json
{
  "name": "Senior Engineer",
  "adapter": "claude-local",
  "role": "Senior Software Engineer",
  "capabilities": "Full-stack development, API design, database schema, testing",
  "reports_to": "agent_cto_id",
  "config": {
    "heartbeat_instruction": "Check assigned tasks. Pick highest priority. Write tests first (TDD). Implement. Report results.",
    "workspace_path": "/path/to/project"
  }
}
```

## Step 6: Map UAIC Skills to Agent Capabilities

| Paperclip Agent Role | UAIC Agent | UAIC Skills |
|---------------------|-----------|-------------|
| CEO | orchestrator, product-owner | product/strategy, routing/pm-orchestration |
| CTO | backend-specialist, database-architect | architecture/*, backend/* |
| Frontend Lead | frontend-specialist | frontend/*, ui-ux |
| QA Engineer | test-engineer, qa-automation | testing/*, verification/* |
| DevOps | devops-engineer | devops/*, shell/* |
| Security | security-auditor | security/* |
| Docs Writer | documentation-writer | docs/* |

## Step 7: Set Budgets

```http
PATCH http://localhost:3100/api/companies/:companyId
Content-Type: application/json

{
  "budget_cents": 100000,
  "budget_alert_threshold_cents": 20000,
  "budget_hard_stop_cents": 5000
}
```

Budget rules:
- **Alert threshold** — agent gets warning when budget drops below this
- **Hard stop** — agent MUST stop work when budget reaches this level
- UAIC agents respect budget by checking before expensive operations

## Step 8: Create Initial Tasks

```http
POST http://localhost:3100/api/companies/:companyId/issues
Content-Type: application/json

{
  "title": "Define product V1 scope and architecture",
  "description": "Break down company goal into technical milestones. Create architecture document.",
  "assignee": "agent_ceo_id",
  "priority": "critical",
  "parent_id": null
}
```

## Step 9: Start Heartbeats

Once agents and tasks are configured:
1. Agents start their heartbeat loops
2. Each heartbeat: check tasks → checkout → execute → report → release
3. Monitor via Paperclip UI at `http://localhost:3100`

## UAIC Integration Checklist

- [ ] UAIC workspace has `GEMINI.md` with §XXIII (Paperclip protocol)
- [ ] `.mcp.json` has Neural Memory + Context+ configured
- [ ] `NEURALMEMORY_BRAIN` set to project-specific brain
- [ ] `/start-session` workflow includes Paperclip health check
- [ ] Agent adapter configs point to correct workspace paths
- [ ] Budget limits configured for each agent
- [ ] Board governance enabled (human approvals for key decisions)

## Monitoring

### Paperclip Dashboard
- `http://localhost:3100` — company overview, agent status, task board

### UAIC Brain Dashboard
- `http://localhost:3333` — NM health, C+ activity, tool usage

### Neural Memory Dashboard
- `http://localhost:52836` — memory neurons, synapses, consolidation
