---
name: Hypothesis Testing
description: Structured experiment design with Bayesian confidence tracking for investigating unknown behaviors
---

# Hypothesis Testing

> Systematic approach to investigating unknowns using hypothesis-evidence-update cycles.

## When to Use

- Unfamiliar system behavior with unknown root cause
- Performance anomalies with multiple possible explanations
- Architecture decisions with uncertain outcomes
- New technology evaluation
- Intermittent bugs that resist simple debugging

## Core Protocol: Hypothesis → Experiment → Update

### Step 1: Formulate Hypothesis

```markdown
## Hypothesis: [H-NNN]
**Statement**: [Clear, falsifiable claim]
**Prior Confidence**: [0.0 - 1.0] with justification
**Predictions**: If true, we should observe [X]
**Falsification**: If false, we would see [Y]
**Test Plan**: [Specific experiment to run]
```

### Step 2: Design Experiment

```markdown
## Experiment Design
**Target**: Hypothesis H-NNN
**Method**: [What to do]
**Controls**: [What stays constant]
**Variables**: [What changes]
**Expected Outcome (if true)**: [Measurable result]
**Expected Outcome (if false)**: [Measurable result]
**Time Box**: [Maximum time to spend]
```

### Step 3: Run & Observe

```markdown
## Experiment Results
**Observation**: [What actually happened]
**Data**: [Metrics, logs, screenshots]
**Matches Prediction?**: YES / NO / PARTIAL
```

### Step 4: Bayesian Update

```markdown
## Confidence Update
**Prior**: [0.X]
**Evidence Type**: FOR / AGAINST / NEUTRAL
**Evidence Strength**: [0.1 - 1.0] (weak → strong)
**Posterior**: [Updated confidence]
**Decision**: CONTINUE TESTING / CONFIRMED / REFUTED / EVOLVE
```

### Update Rules

| Evidence | Prior | Direction | New Prior |
|----------|-------|-----------|-----------|
| Strong FOR | Any | ↑ | +0.15 to +0.3 |
| Weak FOR | Any | ↑ | +0.05 to +0.1 |
| Strong AGAINST | Any | ↓ | -0.15 to -0.3 |
| Weak AGAINST | Any | ↓ | -0.05 to -0.1 |
| Neutral | Any | — | No change |

### Termination Conditions

| Condition | Action |
|-----------|--------|
| Confidence ≥ 0.9 with ≥3 evidence-for | CONFIRMED — proceed with fix |
| Confidence ≤ 0.1 with ≥3 evidence-against | REFUTED — discard hypothesis |
| 5+ experiments with no convergence | EVOLVE — reformulate hypothesis |
| Time box exceeded | ESCALATE — document findings, ask user |

## Multi-Hypothesis Investigation

When multiple explanations compete:

```markdown
## Investigation: [Problem Description]

| ID | Hypothesis | Prior | Evidence Count | Current Confidence |
|----|-----------|-------|----------------|-------------------|
| H-1 | [Statement] | 0.5 | 2 FOR, 1 AGAINST | 0.65 |
| H-2 | [Statement] | 0.3 | 0 FOR, 2 AGAINST | 0.08 → REFUTED |
| H-3 | [Statement] | 0.4 | 1 FOR, 0 AGAINST | 0.55 |

**Next Experiment**: Target H-1 (highest confidence, needs confirmation)
```

### Prioritization Rules

1. Test the most likely hypothesis first (highest prior)
2. Design experiments that can eliminate multiple hypotheses at once
3. Prefer cheap, fast experiments over expensive ones
4. If two hypotheses are close in confidence, test the one easier to falsify

## Neural Memory Integration

### Store Hypothesis
```
nmem_hypothesize(
  action="create",
  content="[Hypothesis statement]",
  confidence=0.5,
  tags=["investigation", "<component>"]
)
```

### Add Evidence
```
nmem_evidence(
  hypothesis_id="[from create]",
  content="[What was observed]",
  type="for" | "against",
  weight=0.5
)
```

### Check Status
```
nmem_hypothesize(action="list", status="active")
```

## Integration with UAIC

### Agent Routing
- Primary: `debugger` agent (bug investigation)
- Support: `test-engineer` (experiment design), `performance-optimizer` (perf hypotheses)

### Workflow Integration
- Pre-condition for `/debug` when root cause is unknown
- Feeds into `decisionLog.md` when confirmed hypothesis drives architecture decision
- Pairs with `causal-analysis` skill for the "Why" behind confirmed hypotheses

### Structured Reasoning Connection
- GEMINI.md §5.1: Use hypothesis testing for MEDIUM+ risk bugs
- After confirmation → feed into 5 Whys for deeper root cause
- Multi-hypothesis → Pros/Cons Matrix for comparing fix approaches

## Anti-Patterns

- ❌ Testing multiple hypotheses simultaneously (confounds results)
- ❌ Confirmation bias (only looking for evidence supporting your favorite)
- ❌ No time box (spending forever on low-probability hypothesis)
- ❌ Ignoring negative results (they are equally valuable)
- ❌ Not recording experiments (losing knowledge for future investigations)
- ❌ Vague hypotheses that can't be falsified
