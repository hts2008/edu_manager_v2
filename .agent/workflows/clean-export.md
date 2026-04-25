---
description: "Clean export — strip project state, preserve intelligence layer, sync runtime"
---

// turbo-all

## Overview

This workflow is the execution engine for `/clean-export`. It handles the full reset lifecycle from preflight through verification.

## Prerequisites

- Workspace contains `GEMINI.md`, `KANBAN.md`, `memory/` directory
- User has confirmed intent (no auto-execution without confirmation)

## Step 1: Preflight

```
1a. Check git status — warn if dirty working tree
1b. Count intelligence layer files (baseline for verification)
1c. Display KEEP / RESET / DELETE summary
1d. Require explicit confirmation: "Proceed with clean export? [y/N]"
    IF --dry-run → show summary and EXIT
```

## Step 2: Archive (Optional)

```
IF --archive:
  2a. Create timestamped archive: receipts/exports/archive-[YYYY-MM-DD].zip
  2b. Include: memory/, KANBAN.md, project-control/, reports/
  2c. Verify archive integrity
```

## Step 3: Reset Memory

```
3a. Overwrite memory/memory-bank/ (7 files) with starter templates
3b. Overwrite memory/brain/ (3 files — keep model-preferences.md)
3c. Overwrite memory/sessions/ (2 files) with blank templates
3d. Overwrite memory/kanban/ (2 files) with blank
3e. Clear memory/events/ (keep .gitkeep)
3f. Clear memory/summaries/ (keep .gitkeep)
3g. Clear memory/action-memory/ (keep .gitkeep)
```

## Step 4: Reset KANBAN

```
4a. Overwrite KANBAN.md with template board
4b. Overwrite project-control/ (5 files) with blank templates
```

## Step 5: Clear Evidence

```
5a. Delete reports/*.md (project-specific)
5b. Clear receipts/sessions/, receipts/exports/, receipts/artifacts/ (keep dirs)
5c. Keep receipts/README.md
5d. Delete .mcp_data/ (Context+ runtime cache — project-specific embeddings)
```

## Step 6: Sync Runtime

```
6a. Copy cleaned GEMINI.md → .agent/GEMINI.md
6b. Clear .agent/memory-bank/ (keep structure)
6c. Clear .agent/brain/ (keep structure)
6d. Clear .agent/receipts/ (keep structure)
6e. Clear .agent/outputs/ (keep structure)
6f. Verify .gemini/, .claude/, .codex/ settings unchanged
```

## Step 7: Verify

```
7a. Run scripts/verify-clean-state.ps1
7b. Check intelligence layer file count matches baseline
7c. Grep for project-specific strings (BUILD-001, T-016, etc.)
7d. Verify KANBAN.md contains only template content
7e. Verify /start-session would detect FRESH_INIT
```

## Step 8: Report

```
8a. Output summary: files kept / reset / deleted
8b. Output verification result: PASS / FAIL
8c. Save report to reports/clean-export-validation.md
```

## Exit Conditions

| Condition | Result |
|-----------|--------|
| Verification passes | ✅ Clean export complete |
| Verification fails | ⚠️ Report failures, suggest manual fix |
| User cancels at confirmation | ⏹ No changes made |
| Archive step fails | ⚠️ Warn but continue (archive is optional) |

## Integration Points

| System | Connection |
|--------|-----------|
| `commands/clean-export.md` | This workflow is the ENGINE behind the command |
| `scripts/clean-export.ps1` | Automated script equivalent |
| `scripts/verify-clean-state.ps1` | Verification tool used in Step 7 |
| `workflows/start-session.md` | Verifies post-export readiness |
