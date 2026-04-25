---
name: Causal Analysis
description: 5 Whys methodology, cause-effect chains, and root cause analysis for debugging and failure investigation
---

# Causal Analysis

> Systematic root cause identification using structured causal reasoning patterns.

## When to Use

- Bug investigation with unclear origin
- Production incident post-mortem
- Performance degradation analysis
- Feature regression analysis
- Architecture failure cascades

## Core Method: 5 Whys

The 5 Whys technique drills from symptom to root cause by repeatedly asking "Why?".

### Protocol

```
SYMPTOM: [Observable problem]
  WHY 1: [Direct cause] → evidence: [test/log/metric]
  WHY 2: [Cause of WHY 1] → evidence: [test/log/metric]
  WHY 3: [Cause of WHY 2] → evidence: [test/log/metric]
  WHY 4: [Cause of WHY 3] → evidence: [test/log/metric]
  WHY 5: [Root cause] → evidence: [test/log/metric]
ROOT CAUSE: [Statement]
FIX: [Action]
PREVENTION: [Systemic change]
```

### Rules

1. Each "Why" MUST have evidence — no speculation
2. Stop when you reach a systemic, fixable root cause
3. If a "Why" splits into multiple causes, investigate each branch
4. Document dead-end branches too (they save future debugging time)
5. Mark confidence level: CONFIRMED (evidence), LIKELY (partial evidence), HYPOTHESIS (needs testing)

### Example

```
SYMPTOM: API response time increased from 50ms to 500ms
  WHY 1: Database queries are slow → evidence: query log shows 450ms avg
  WHY 2: Full table scans on `orders` table → evidence: EXPLAIN shows seq scan
  WHY 3: Missing index on `user_id` column → evidence: no index in schema
  WHY 4: Migration #47 dropped and recreated table without indexes → evidence: migration file
  WHY 5: Migration template doesn't include index recreation → evidence: template file
ROOT CAUSE: Migration template lacks index preservation
FIX: Add index back, update migration template
PREVENTION: Add index validation to migration CI check
```

## Cause-Effect Chain Analysis

For complex problems with cascading effects.

### Template

```markdown
## Cause-Effect Chain: [Problem Title]

### Trigger Event
[What changed or happened]

### Chain
1. [Event A] → causes → [Event B]
   - Evidence: [...]
   - Confidence: [HIGH/MEDIUM/LOW]
2. [Event B] → causes → [Event C]
   - Evidence: [...]
   - Confidence: [HIGH/MEDIUM/LOW]
3. [Event C] → causes → [Observable Problem]
   - Evidence: [...]
   - Confidence: [HIGH/MEDIUM/LOW]

### Intervention Points
| Point | Action | Effort | Impact |
|-------|--------|--------|--------|
| Between A→B | [Fix] | [S/M/L] | [HIGH/MED/LOW] |
| Between B→C | [Fix] | [S/M/L] | [HIGH/MED/LOW] |

### Recommended Fix
[Best intervention point with rationale]
```

## Fishbone (Ishikawa) Diagram

Categorize potential causes systematically:

```
PROBLEM ← People (skill gaps, miscommunication)
        ← Process (missing review, no CI check)
        ← Technology (library bug, version drift)
        ← Environment (config mismatch, infra issue)
        ← Data (corrupt input, schema drift)
        ← Dependencies (upstream API change, rate limiting)
```

### Usage Steps

1. State the problem clearly
2. Brainstorm causes in each category
3. For each cause, ask "Why?" to drill deeper
4. Identify top 3 most likely root causes
5. Design experiments to confirm/eliminate each

## Integration with UAIC

### Agent Routing
- Primary: `debugger` agent
- Support: `test-engineer` (reproduce), `performance-optimizer` (perf issues)

### Workflow Integration
- Used during `/debug` workflow's "Root Cause Analysis" phase
- Output feeds into `decisionLog.md` when fix involves architecture change
- Findings stored in `memory/brain/error-catalog.md`

### Neural Memory Integration
```
nmem_remember(
  type="error",
  content="Root cause: [description]. Fix: [action]. Prevention: [systemic change]",
  tags=["root-cause", "5-whys", "<component>"]
)
```

### Quality Gate
- 5 Whys analysis MUST be completed before fix attempt for MEDIUM+ severity bugs
- Each "Why" must cite evidence (log, test, metric)
- Root cause must be actionable (not "it was a bug")

## Anti-Patterns

- ❌ Stopping at symptoms ("the server crashed" → WHY?)
- ❌ Jumping to conclusions without evidence
- ❌ Blaming people instead of processes
- ❌ Accepting "it just happened" as a root cause
- ❌ Fixing symptoms without addressing root cause
- ❌ Not documenting the investigation for future reference
