---
name: Pros-Cons Matrix
description: Weighted decision matrices for comparing alternatives with structured trade-off analysis
---

# Pros-Cons Matrix

> Systematic comparison of alternatives using weighted scoring for objective decision making.

## When to Use

- Choosing between 2+ technology options
- Comparing architectural approaches
- Evaluating migration strategies
- Selecting vendors or services
- Any decision where trade-offs need explicit quantification

## Core Framework

### Simple Pros-Cons (Quick Decisions)

```markdown
## Decision: [What are we deciding?]

### Option A: [Name]
**Pros**:
- [+] [Benefit] — Weight: [HIGH/MED/LOW]
- [+] [Benefit] — Weight: [HIGH/MED/LOW]

**Cons**:
- [-] [Drawback] — Weight: [HIGH/MED/LOW]
- [-] [Drawback] — Weight: [HIGH/MED/LOW]

### Option B: [Name]
**Pros**:
- [+] [Benefit] — Weight: [HIGH/MED/LOW]

**Cons**:
- [-] [Drawback] — Weight: [HIGH/MED/LOW]

### Recommendation
[Option X] because [rationale]. Confidence: [0.X]
```

### Weighted Decision Matrix (Critical Decisions)

```markdown
## Decision Matrix: [What are we deciding?]

### Criteria Definition
| # | Criterion | Weight (1-10) | Justification |
|---|-----------|---------------|---------------|
| C1 | Performance | 8 | User-facing latency is critical |
| C2 | Maintainability | 7 | Long-term codebase health |
| C3 | Learning curve | 5 | Team onboarding cost |
| C4 | Ecosystem | 6 | Plugin/library availability |
| C5 | Cost | 4 | Budget is flexible |

### Scoring (1-5 per criterion)
| Criterion | Weight | Option A | Score A | Option B | Score B | Option C | Score C |
|-----------|--------|----------|---------|----------|---------|----------|---------|
| C1: Performance | 8 | Fast | 5 (40) | Medium | 3 (24) | Fast | 4 (32) |
| C2: Maintainability | 7 | Good | 4 (28) | Excellent | 5 (35) | Fair | 3 (21) |
| C3: Learning curve | 5 | Steep | 2 (10) | Easy | 4 (20) | Medium | 3 (15) |
| C4: Ecosystem | 6 | Rich | 5 (30) | Growing | 3 (18) | Rich | 4 (24) |
| C5: Cost | 4 | Free | 5 (20) | $50/mo | 2 (8) | Free | 5 (20) |
| **TOTAL** | | | **128** | | **105** | | **112** |

### Sensitivity Analysis
- If performance weight drops to 5: A=113, B=96, C=100 → A still wins
- If cost weight rises to 8: A=148, B=97, C=132 → A wins bigger
- No weight change reverses the ranking → **ROBUST decision**

### Verdict
**Option A** with weighted score **128** vs B(105) and C(112).
Decision is robust under sensitivity analysis.
Confidence: 0.85
```

## Scoring Guidelines

| Score | Meaning |
|-------|---------|
| 5 | Excellent — best in class |
| 4 | Good — above average |
| 3 | Adequate — meets minimum |
| 2 | Poor — below expectations |
| 1 | Failing — critical weakness |

### Weight Guidelines

| Weight | Meaning | When to use |
|--------|---------|-------------|
| 9-10 | Critical | Non-negotiable requirements |
| 7-8 | Important | Core business needs |
| 5-6 | Moderate | Nice-to-have with real impact |
| 3-4 | Low | Preference, not requirement |
| 1-2 | Minimal | Tiebreaker only |

## Sensitivity Analysis

ALWAYS perform sensitivity analysis for HIGH risk decisions:

1. **Vary each weight ±30%** and re-calculate totals
2. **Identify threshold**: At what weight does the winner change?
3. **Check robustness**: If ranking is stable under all variations → ROBUST
4. **Flag fragility**: If small weight changes flip the winner → additional evidence needed

## Decision Record Integration

After completing analysis, write to `decisionLog.md`:

```markdown
### DEC-NNN: [Decision Title]
**Date**: [YYYY-MM-DD]
**Context**: [Problem statement]
**Decision**: [Chosen option] based on weighted decision matrix
**Rationale**: Scored [X] vs alternatives ([Y], [Z]). Robust under sensitivity analysis.
**Alternatives**: [Option B: reason rejected] [Option C: reason rejected]
**Status**: PLANNED / IMPLEMENTED
```

## Integration with UAIC

### Agent Routing
- Primary: Any agent making multi-option decisions
- Common: `project-planner`, `product-owner`, `code-archaeologist`

### GEMINI.md Reference
- §5.1: Pros/Cons Matrix for "so sánh lựa chọn"
- §6: EVALUATE → SELECT → DOCUMENT → COMMIT

### Workflow Integration
- Used during `/plan` and `/brainstorm` for option comparison
- Output feeds directly into `decisionLog.md`
- Pairs with SWOT (strategic view) + Sequential Thinking (deep analysis)

### Neural Memory
```
nmem_remember(
  type="decision",
  content="Chose [X] over [Y],[Z]. Score: [N] vs [M],[P]. Robust: [yes/no].",
  tags=["decision-matrix", "<domain>"]
)
```

## Anti-Patterns

- ❌ Equal weights for all criteria (defeats the purpose — some things matter more)
- ❌ Scoring without justification (numbers need explanation)
- ❌ Skipping sensitivity analysis for important decisions
- ❌ Using the matrix to justify a decision already made (work backwards)
- ❌ Too many criteria (>10 adds noise — consolidate related ones)
- ❌ Not involving stakeholders in weight definition
