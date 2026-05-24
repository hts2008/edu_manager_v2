---
name: cli-orchestration
description: CLI Agent Spawn — dispatch coding/QA/UI tasks to external AI CLIs with full output capture
---

# CLI Orchestration Skill

## When to Use

Use this skill when the PM Orchestrator needs to delegate a focused task to an external AI CLI:
- **Coding tasks** → Claude Code CLI (create, refactor, architecture, implement)
- **QA/QC tasks** → Codex CLI (debug, review, test, verify, check bug)
- **Frontend/UI tasks** → Gemini CLI (ui-ux, design, CSS, layout)

## Core Principle

**Antigravity is the PM coordinator** — planning, routing, context management, QA/QC.
**CLIs are execution workers** — they receive focused prompts and return results.
**No cross-CLI fallback** — if a CLI quota is exhausted, fall back to Antigravity role-switch, NOT another CLI.

## CLI Routing Matrix

| Task Type | CLI | Primary Model | Fallback Model | Quota Fallback |
|-----------|-----|---------------|----------------|----------------|
| Coding | Claude Code | `claude-opus-4-6` | `claude-sonnet-4-6` | Antigravity inline |
| QA/QC | Codex | `gpt-5.4` (reasoning xhigh) | `codex-5.3` (reasoning high) | Antigravity inline |
| Frontend/UI | Gemini | `gemini-3.1-pro-preview` | — | Antigravity inline |

## Spawn Command

```powershell
.\scripts\cli-spawn.ps1 -CLI <claude|codex|gemini> -Task "prompt" [-Model model] [-TaskType coding|qa|ui] [-TaskId T001] [-TimeoutSec 300]
```

### Auto-routing by TaskType

```powershell
.\scripts\cli-spawn.ps1 -TaskType coding -Task "Implement user authentication with JWT"
.\scripts\cli-spawn.ps1 -TaskType qa -Task "Review auth.ts for security vulnerabilities"
.\scripts\cli-spawn.ps1 -TaskType ui -Task "Create a responsive dashboard layout"
```

## Exit Codes

| Code | Meaning | PM Action |
|------|---------|-----------|
| 0 | Success | Read log, integrate results |
| 1 | CLI error | Log error, retry or escalate |
| 2 | Quota exhausted | **Role-switch to Antigravity** (NO cross-CLI) |
| 3 | Timeout | Decompose task, retry smaller |
| 4 | CLI not found | Skip CLI, execute inline |

## Output Capture

All CLI output is captured to `logs/cli-sessions/` with two files per execution:

### Log file (`*.log`)
Full raw output including:
- CLI banner and model info
- Thinking/reasoning traces (stream-json format)
- Tool calls and results
- Final response
- Token usage

### Meta file (`*.meta.json`)
```json
{
  "timestamp": "2026-04-05T23:19:30+07:00",
  "cli": "claude",
  "model": "claude-opus-4-6",
  "task_type": "coding",
  "task_id": "T001",
  "prompt_chars": 450,
  "output_chars": 3200,
  "duration_sec": 45.2,
  "exit_code": 0,
  "quota_exhausted": false,
  "fallback_used": null,
  "log_file": "20260405-231930_claude_coding_T001.log",
  "workdir": "C:\\Users\\haitr\\OneDrive\\0. GAU DATA\\0.APP\\EDU_MANAGER_V2"
}
```

## Thinking/Reasoning Capture by CLI

| CLI | Format | Flags | Thinking Content |
|-----|--------|-------|-----------------|
| Claude | NDJSON stream | `--output-format stream-json --verbose` | `type: "thinking"` blocks |
| Codex | JSONL | `--json -c model_reasoning_summary=detailed -c model_verbosity=high` | Reasoning summaries in events |
| Gemini | NDJSON stream | `--output-format stream-json` | Full stream output (no raw thinking tokens) |

## Integration with PM Workflow

The PM workflow (`pm.md`) DISPATCH state uses this skill:

```
1. Classify task → determine task_type
2. If task_type in [coding, qa, ui]:
   a. Spawn CLI via cli-spawn.ps1
   b. Read log output
   c. If exit_code == 2 (quota): Antigravity role-switch
3. Else: execute inline in Antigravity
```

## Anti-Patterns

- ❌ Sending Claude a QA task because Codex quota is exhausted
- ❌ Sending Codex a coding task because Claude quota is exhausted
- ❌ Running CLI without capturing output
- ❌ Infinite retry loops on same CLI
- ❌ Spawning CLI for trivial tasks (< 1 min in Antigravity)

## When NOT to Use CLI Spawn

- Task is trivial (simple edit, formatting, comment)
- Task requires interactive context (multi-turn conversation)
- Task requires browser/visual verification
- Task requires access to MCP tools (NM, C+) — CLIs don't have these
