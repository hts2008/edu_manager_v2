---
name: orchestrate
description: "Legacy alias — redirects to /pm (PM Orchestrate). Kept for backward compatibility."
version: "4.1"
deprecated: true
redirect: pm
---

# /orchestrate → /pm (Redirect)

> **⚠️ `/orchestrate` is now a legacy alias.** Use `/pm` instead for the full PM experience.

## Behavior When Called

When `/orchestrate` is invoked, the system:

1. **Logs deprecation notice**: `"ℹ️ /orchestrate is now an alias for /pm. Redirecting..."`
2. **Passes the full request to `/pm`** with all original arguments intact
3. **Executes the /pm lifecycle** (intake → plan → dispatch → QA → delivery)
4. **Output is identical** to what `/pm` would produce

## What Changed

| Aspect | Old `/orchestrate` | New `/pm` |
|--------|-------------------|-----------|
| Scope | Multi-agent coordination only | Full PM lifecycle (intake→delivery) |
| Planning | No execution plan | Execution plan with risk/review/gates |
| Subcommands | None | status, standup, retro, plan, triage, architecture, release, budget, escalate |
| KANBAN integration | Basic status update | Full task lifecycle management |
| QA/QC | Basic quality gates | Risk-tiered gate selection + evidence verification |
| Decision protocol | None | Auto-approve / user-approval / adversarial review matrix |
| PM brain | None | 6-lens intent analysis before execution |

## Migration

No action required to migrate. `/orchestrate` automatically routes to `/pm`. Existing workflows that reference `/orchestrate` will continue to work.

For new work, prefer `/pm` directly:
```
Old: /orchestrate build user registration
New: /pm build user registration

Old: /orchestrate (no subcommands available)
New: /pm status
New: /pm standup
New: /pm retro
```