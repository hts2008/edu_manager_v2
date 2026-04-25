# .agent/ Runtime Architecture

This directory is the compiled runtime target for Antigravity.
It mirrors canonical sources for fast access during sessions.

## Structure
- agents/ — 23 agent contracts
- commands/ — 19 command entrypoints
- workflows/ — 17 workflow procedures
- skills/ — skill references (loaded on-demand from canonical)
- rules/ — 12 coding rules
- manifests/ — 11 configuration files
- memory-bank/ — symlink/copy of memory/memory-bank/
- brain/ — symlink/copy of memory/brain/
- contracts/ — API contracts, specs
- signals/ — inter-agent communication
- outputs/ — CLI subagent outputs
- receipts/ — evidence files
- project-control/ — sprint/dependency maps

## Regeneration
Run scripts/compile-targets.py to regenerate from canonical sources.