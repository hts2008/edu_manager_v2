---
description: "Central PM hub — intake, plan, dispatch, QA/QC, deliver any development request"
---

# /pm — Product & Project Management Orchestrator

> The central entry point for all development work. Takes any request — feature, bug, audit, plan, review — and drives it through intake → planning → dispatch → QA → delivery.

## When to Use

- **Default for any free-form request** that doesn't have an obvious direct command
- When you need task decomposition + multi-agent coordination
- When you need sprint/project management operations
- When you need architecture decisions facilitated
- When you need a status report, standup, or retrospective

## Invocation

```
/pm <free-form request>          → Full 5-phase lifecycle
/pm status                       → Sprint dashboard
/pm standup                      → Daily standup format
/pm retro                        → Sprint retrospective
/pm plan <goal>                  → Execution plan without dispatch
/pm triage <issue>               → Classify, prioritize, assign
/pm architecture <decision>      → ADR facilitation
/pm release                      → Release readiness check
/pm escalate <issue>             → Escalation report
/pm budget                       → Token/effort efficiency summary
```

## PM Brain — Mental Model

Before executing anything, the PM Orchestrator applies 6 lenses:

1. **Intent Decoding** — What does the user actually need? (not just what they typed)
2. **Hidden Requirements** — What's implied? (validation, error handling, auth, tests, docs, migration)
3. **Risk Assessment** — What can go wrong? (data loss, security holes, breaking changes)
4. **Scope Bounding** — Is this atomic enough? (≤1 feature per task)
5. **Dependency Mapping** — What must happen first? What can parallelize?
6. **Evidence Planning** — What proof is needed to call this "done"?

## 5-Phase Lifecycle

### Phase 1: INTAKE
```
1. Parse request — extract: action verb, target system, constraints, urgency
2. Detect session state — if /start-session not yet run, trigger implicit warm-up
3. Load KANBAN — is this task already on the board? Related to a blocked task?
4. Load activeContext — current technical state, known issues
5. Classify:
   - Task type: create | debug | review | deploy | plan | refactor | audit | docs | release
   - Risk: low (docs, status) | medium (feature, refactor) | high (security, schema, deploy, release)
   - Scope: XS (<30min) | S (<2h) | M (<4h) | L (<1d) | XL (multi-day, must split)
6. If XL → decompose into stories/tasks before proceeding
7. Output: intake summary with classification
```

### Phase 2: PLAN
```
1. Problem framing — what exactly are we solving?
2. Success criteria — how do we know it's done?
3. Task decomposition — break into atomic subtasks if needed
4. Agent assignment per task:
   - Match against manifests/routing.yaml task taxonomy
   - Select review mode: self-check (low) | paired (medium) | adversarial (high)
5. Dependency graph — which tasks block which?
6. Risk profile — what needs user approval? Security review? Judge review?
7. Quality gates — which gates apply per manifests/quality-gates.yaml?
8. Architecture decision points — if schema/API/infra changes needed, flag for ADR
9. Effort estimate — token budget, expected turns
10. Rollback plan — how to undo if it goes wrong?
11. Output: execution plan artifact
```

### Phase 3: DISPATCH
```
1. For each task in dependency order:
   a. Assign to specialist agent
   b. Provide: task description, acceptance criteria, relevant files, context
   c. Execute (or spawn CLI subagent for deep-focus tasks)
   d. Collect output + evidence
2. Parallel tasks: execute simultaneously when no dependency
3. Sequential tasks: wait for predecessor completion + verification
4. Blocked tasks: surface blocker, attempt resolution, escalate if stuck
5. After each task: update KANBAN row, append progress.md
6. If agent hits 3-strike limit: halt, log error, switch approach or escalate
```

### Phase 4: QA/QC
```
1. Run applicable quality gates:
   - lint, type-check, unit tests, integration tests
   - security scan (if risk ≥ medium)
   - judge-agent review (if risk = high)
   - browser verification (if UI changes)
2. Cross-check: all subtask outputs are consistent
3. Verify evidence: test output, screenshots, diff summaries
4. If gate fails: route back to Phase 3 for fix, re-run gate
5. If 3 gate failures on same issue: escalate to user
```

### Phase 5: DELIVERY
```
1. Compile PM report:
   - What was requested
   - What was delivered
   - Files changed (with diff links)
   - Tests run + results
   - Quality gates passed
   - KANBAN status after update
   - Risks remaining
   - Next recommended actions
2. Update KANBAN — all task statuses current, evidence links attached
3. Update memory — activeContext, progress, decisionLog (if new decisions)
4. Update session — current-session.md with latest state
5. If session nearing context limit → trigger handoff protocol
6. Emit receipt to receipts/
```

## Decision Protocol

| Condition | Decision |
|-----------|----------|
| XS scope + low risk | Auto-approve, execute immediately |
| Any scope + medium risk | Execute, run quality gates, self-check |
| Any scope + high risk | Plan → user approval → execute → adversarial review |
| Schema/migration change | Mandatory: database-architect + judge-agent review |
| Security-related | Mandatory: security-auditor review |
| Deploy/release | Mandatory: release-manager checklist + user approval |
| Scope XL detected | MUST split into smaller tasks before dispatch |
| Task not on KANBAN | Add to board before starting work |
| Conflicting decisions in decisionLog | HALT — surface conflict, get user resolution |

## Subcommand Details

### `/pm status`
```
Output format:
═══ PM STATUS REPORT ═══
Sprint: [name] — [status]
Tasks: [X] done | [Y] in progress | [Z] blocked | [W] planned
Health: [HEALTHY/WARNING/CRITICAL]
Blockers: [list or "none"]
Last completed: [task ID + name]
Currently active: [task ID + name]
▶ Recommended next: [task + rationale]
```

### `/pm standup`
```
Output format:
═══ DAILY STANDUP ═══
Yesterday: [completed tasks from progress.md last entry]
Today: [planned tasks from KANBAN IN PROGRESS + next PLANNED]
Blockers: [BLOCKED tasks with reasons]
Risks: [from activeContext unresolved_risks]
Context health: [% estimated usage]
```

### `/pm retro`
```
Output format:
═══ SPRINT RETROSPECTIVE ═══
Sprint: [name]
Completed: [IMPLEMENTED tasks with evidence]
Velocity: [tasks/session]
What worked: [patterns from learned-patterns.md]
What didn't: [errors from error-catalog.md]
Improvements: [suggested process changes]
Carryover: [PARTIAL or DEFERRED tasks]
```

### `/pm architecture <decision>`
```
1. Frame the decision: what are we choosing between?
2. List options with pros/cons
3. Check decisionLog — has this been decided before?
4. Recommend option with rationale
5. If user approves → append to decisionLog.md with DEC-NNN ID
6. Update systemPatterns.md if pattern established
```

### `/pm release`
```
1. Check all IMPLEMENTED tasks have evidence
2. Run full quality gate pass (all 11 gates)
3. Check for unresolved blockers
4. Generate release checklist:
   - Migration scripts needed?
   - Environment variables changed?
   - Breaking API changes?
   - Rollback plan documented?
5. Route to release-manager for final verdict
```

## Escalation Protocol

```
LEVEL 1: Agent self-fix (retry with different approach)
LEVEL 2: PM re-routes to different agent
LEVEL 3: PM requests user input (approval, clarification, or decision)
LEVEL 4: PM halts work, documents blocker, suggests unblock path
```

Triggers:
- 3-strike failure → L2
- Conflicting requirements → L3
- Production data risk → L3
- Scope creep detected → L3
- All agents exhausted → L4

## Anti-Patterns

- ❌ PM writing code — PM routes to specialists, never codes
- ❌ Skipping intake — jumping to execution without understanding intent
- ❌ Scope creep — accepting expanding requirements without re-planning
- ❌ Evidence-free delivery — claiming "done" without test output/screenshots
- ❌ KANBAN orphans — doing work that's not on the board
- ❌ Silent failures — swallowing agent errors without escalation

## Integration Points

| System | How /pm connects |
|--------|-----------------|
| `/start-session` | Boot sequence — /pm requires warmed-up session |
| `KANBAN.md` | Source of task state — /pm reads and writes |
| `manifests/routing.yaml` | Agent/workflow selection matrix |
| `manifests/quality-gates.yaml` | Gate requirements per risk level |
| `memory/memory-bank/*` | Context loading and state persistence |
| `memory/sessions/*` | Session continuity and handoff |
| `receipts/` | Evidence trail for all /pm operations |
| All specialist agents | Execution workforce — /pm dispatches, they deliver |
