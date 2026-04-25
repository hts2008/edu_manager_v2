---
description: Brain maintenance — autoDream-inspired 4-phase consolidation pipeline
---

// turbo-all

## Overview

This workflow powers the `/consolidate` command. It implements the autoDream-inspired 4-phase consolidation pipeline (Orient → Gather → Consolidate → Report) with three-gate triggering from GEMINI.md §22.2.

**Difference from `commands/consolidate.md`**: The command is the user-facing contract. This workflow is the internal execution engine with branching logic, error handling, and integration points.

## Entry Conditions

| Condition | Check |
|-----------|-------|
| Neural Memory available | NM MCP server is connected and responsive |
| Session active | Session is in progress (implicit or explicit) |
| Not currently consolidating | Prevent re-entrant consolidation |

## Three-Gate Evaluation

Before consolidation, evaluate all three gates:

```
gate_1_time = (now - last_consolidation) ≥ 2 hours
gate_2_tasks = completed_tasks_since_last_consolidation ≥ 3
gate_3_health = brain_grade < 'B' OR purity < 75%
```

Decision tree:
```
IF --force flag → SKIP gates → proceed to Orient
IF 0 gates pass → OUTPUT "Brain healthy" → EXIT
IF 1 gate passes → OUTPUT "1/3 gates — monitoring, not consolidating" → EXIT  
IF 2+ gates pass → proceed to Orient
```

## Execution Pipeline

### Phase 1: Orient

```
PARALLEL:
  ├─ nmem_health(compact=true) → baseline_metrics
  └─ nmem_stats(compact=true) → current_counts

Record:
  - pre_grade = health.grade
  - pre_purity = health.purity_score
  - pre_neurons = stats.neuron_count
  - pre_synapses = stats.synapse_count
```

### Phase 2: Gather

```
Collect session signals:
  - Count memories written this session (from session tracking)
  - Identify unlinked neurons (from health warnings)
  - Flag orphan nodes

IF no signals to gather:
  LOG "No new signals — consolidation may have minimal impact"
  CONTINUE (don't abort — pruning and linking still useful)
```

### Phase 3: Consolidate

```
strategy = user_selected OR "all"

nmem_consolidate(strategy=strategy, compact=true)

IF strategy == "all":
  The NM server runs 10 sub-strategies:
    prune → merge → dedup → mature → dream → 
    semantic_link → compress → detect_drift → 
    learn_habits → enrich

  Expected duration: 5-15 seconds

IF timeout (>30s):
  ABORT consolidation
  LOG warning
  CONTINUE to Report phase with partial results

IF error:
  LOG error details
  RETRY once with strategy="prune" (least destructive)
  IF still fails → SKIP to Report with error note
```

### Phase 4: Report

```
PARALLEL:
  ├─ nmem_health(compact=true) → post_metrics
  └─ nmem_tool_stats(action="summary", compact=true) → usage_report

Compute deltas:
  - grade_change = post_grade - pre_grade
  - purity_change = post_purity - pre_purity
  - neuron_delta = post_neurons - pre_neurons
  - synapse_delta = post_synapses - pre_synapses

FORMAT report (see commands/consolidate.md for template)

IF grade_dropped:
  FLAG WARNING "Grade dropped during consolidation — investigate"
  
IF grade >= B:
  FLAG SUCCESS "Brain healthy"
```

## Integration Points

### Session Start (/start-session)

After context loading, the start-session workflow calls consolidate IF:
- Brain grade < B (Gate 3 auto-pass)
- This provides session-start health maintenance

### Session Close (/session-close)

Before handoff, the session-close workflow ALWAYS runs:
```
nmem_consolidate(strategy="all", compact=true)
nmem_health(compact=true)
nmem_tool_stats(action="summary", compact=true)
```
This is MANDATORY, regardless of gates.

### Mid-Session (§22.2)

Any agent can trigger consolidation mid-session when 2/3 gates pass. This is checked:
- After every task completion
- When explicitly requested by user

## Failure Branches

| Failure | Recovery |
|---------|----------|
| NM server unreachable | Skip consolidation, log degradation, continue session |
| Consolidation returns error | Retry with prune-only, then skip |
| Grade drops post-consolidation | Log warning, suggest manual investigation |
| Timeout >30s | Abort, report partial, continue session |
| Re-entrant call (already consolidating) | Skip, log duplicate attempt |

## Exit Conditions

| Condition | Result |
|-----------|--------|
| All phases complete + report generated | ✅ Success |
| NM unavailable | ⚠️ Degraded — logged, session continues |
| Critical error in consolidation | ❌ Failed — logged, manual intervention suggested |
