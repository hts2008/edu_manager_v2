---
name: context-engineering
description: "Workspace memory, session continuity, context management"
---

# Context Engineering Skill

## Quick Reference

### Memory Architecture
```
memory/
├── memory-bank/          ← persistent knowledge
│   ├── activeContext.md  ← current state (rewrite per session)
│   ├── progress.md       ← append-only log (NEVER overwrite)
│   ├── decisionLog.md    ← architecture decisions (immutable entries)
│   ├── systemPatterns.md ← recurring patterns
│   └── techContext.md    ← stack, deps, versions
├── brain/                ← learned knowledge
│   ├── learned-patterns.md  ← reusable solutions
│   └── error-catalog.md     ← known errors + fixes
└── sessions/             ← session continuity
    ├── current-session.md   ← active session state
    └── handoff.md           ← next session needs
```

### Session Start Protocol
1. Read KANBAN.md → sprint state
2. Read activeContext.md → technical state
3. Read progress.md → last 5 entries
4. Read decisionLog.md → decisions
5. Read current-session.md → resume point
6. Report: "Sprint [N]: [X] done, [Y] in progress. Resume: [task]"

### Context Management Rules
- Compaction trigger: context > 70%
- Global memory (GEMINI.md): stable cross-project facts ONLY
- Workspace memory: all project-specific state
- activeContext.md: rewrite each session, never append

## Anti-Patterns
- Context rot: loading stale information
- Memory spam: writing every event to permanent memory
- Global leakage: workspace state in ~./gemini/GEMINI.md