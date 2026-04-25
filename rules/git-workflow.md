---
name: git-workflow
description: "Branch strategy, commit conventions, PR process, merge rules"
version: "4.0"
enforcement: mandatory
human_override: "User can override with explicit justification documented in decisionLog.md"
---

# Rule: Git Workflow

## R1: Branch Strategy

```
main            → production-ready, always deployable
develop         → integration branch (optional, for larger teams)
feature/T-XXX-* → one branch per task
fix/T-XXX-*     → bug fixes
hotfix/*        → emergency production fixes
```

- Branch from `main` (or `develop` if used)
- One branch per KANBAN task
- Short-lived: merge within 3 days (avoid long-lived branches)
- Delete branch after merge

## R2: Conventional Commits

```
<type>(<scope>): <description>

types: feat | fix | refactor | test | docs | chore | perf | ci | style
scope: component or module name (optional)
description: imperative mood, lowercase, no period
```

Examples:
```
feat(auth): add JWT refresh token rotation
fix(orders): handle null shipping address gracefully
refactor(user-service): extract validation into separate module
test(payment): add integration tests for refund flow
docs(readme): update deployment instructions
chore(deps): update prisma to 6.2.0
```

## R3: Commit Rules

- One logical change per commit (not "fix everything")
- No commits with failing tests
- No commits with lint errors
- No WIP commits on shared branches (use `git stash` instead)
- No merge commits in history — use rebase or squash

## R4: PR Process

```
1. Create PR with: title (conventional commit format), description, linked KANBAN task
2. Fill PR template: what changed, why, how to test, breaking changes
3. CI must pass before review
4. At least 1 approval required (adversarial for high-risk)
5. No force-push after review started
6. Squash merge to main (clean history)
```

## R5: Code Review Etiquette

- Review within 24h (blockers within 4h)
- Be specific: cite file and line, explain impact, suggest fix
- Distinguish: 🔴 must fix, 🟡 should fix, 🟢 nit
- Acknowledge good patterns (positive reinforcement)

## Verification

- Automated: commit lint in CI (commitlint), branch name check
- Review: judge-agent reviews PR format

## Related

- Agent: `agents/judge-agent.md`
- Skills: `skills/git-operations/`