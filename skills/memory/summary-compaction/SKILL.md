---
name: Summary Compaction
description: Memory compaction: reducing context size while preserving key information
---

# Summary Compaction

## When To Compact
- Context window usage exceeding 50 percent
- Memory files growing beyond 200 lines
- Redundant information across multiple files
- Session ending with large accumulated context

## Compaction Strategy
- Keep: decisions, unresolved risks, active patterns, next steps
- Remove: resolved issues, completed task details, debug logs
- Summarize: long discussions into key conclusions
- Preserve: links to evidence and artifacts

## Process
1. Identify redundant or resolved content
2. Extract key facts and decisions
3. Write compact summary
4. Verify no critical information lost
5. Archive original if needed

## Rules
- Never delete decision log entries (archive instead)
- Always keep last 5 progress entries
- Preserve all active error catalog entries
- Keep all unresolved blockers visible
