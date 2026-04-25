---
name: Safe Commanding
description: Safe command execution: risk assessment, dry-run, rollback planning
---

# Safe Commanding

## Command Risk Assessment
- Read-only commands: safe to auto-run (ls, cat, grep, git status)
- State-modifying: require review (npm install, git commit, mkdir)
- Destructive: require explicit approval (rm, drop, reset)

## Safe Execution Patterns
- Dry-run first when available (terraform plan, npm publish --dry-run)
- Preview output before committing (git diff before git commit)
- Backup before destructive operations
- Use version control as safety net

## Rollback Planning
- Before any destructive command, know how to undo
- Database: have migration rollback ready
- Files: git can restore deleted files
- Infrastructure: keep old configuration available

## Anti-Patterns
- Running rm -rf without double-checking path
- Dropping database tables without backup
- Force pushing to shared branches
- Running unknown scripts without reading them first

## Evidence
- Log all commands executed during a task
- Capture output for verification
- Note any side effects observed
