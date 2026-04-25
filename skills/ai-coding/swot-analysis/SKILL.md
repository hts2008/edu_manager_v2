---
name: SWOT Analysis
description: Strengths, Weaknesses, Opportunities, Threats framework for technology evaluation and strategic decisions
---

# SWOT Analysis

> Rapid quadrant analysis for evaluating technologies, tools, libraries, and architectural approaches.

## When to Use

- Evaluating a new tool, library, or service before adoption
- Assessing current tech stack health
- Planning feature priorities
- Comparing migration strategies
- Pre-mortem on upcoming architecture changes

## Core Framework

```
┌──────────────────────┬──────────────────────┐
│     STRENGTHS        │     WEAKNESSES       │
│   (Internal +)       │    (Internal -)      │
│                      │                      │
│ What works well?     │ What's limiting us?  │
│ What advantages?     │ What gaps exist?     │
│ What's proven?       │ What causes friction? │
├──────────────────────┼──────────────────────┤
│   OPPORTUNITIES      │      THREATS         │
│   (External +)       │    (External -)      │
│                      │                      │
│ What can we exploit? │ What could hurt us?  │
│ What trends help?    │ What risks exist?    │
│ What's emerging?     │ What's changing?     │
└──────────────────────┴──────────────────────┘
```

## Template

```markdown
## SWOT: [Subject of Analysis]
**Date**: [YYYY-MM-DD]
**Context**: [Why is this analysis being done?]

### Strengths (Internal Positive)
- [S1] [Description] — Evidence: [...]
- [S2] [Description] — Evidence: [...]
- [S3] [Description] — Evidence: [...]

### Weaknesses (Internal Negative)
- [W1] [Description] — Impact: [HIGH/MED/LOW]
- [W2] [Description] — Impact: [HIGH/MED/LOW]
- [W3] [Description] — Impact: [HIGH/MED/LOW]

### Opportunities (External Positive)
- [O1] [Description] — Timeline: [...]
- [O2] [Description] — Timeline: [...]

### Threats (External Negative)
- [T1] [Description] — Likelihood: [HIGH/MED/LOW], Impact: [HIGH/MED/LOW]
- [T2] [Description] — Likelihood: [HIGH/MED/LOW], Impact: [HIGH/MED/LOW]

### Strategic Actions
| Leverage | Action |
|----------|--------|
| S+O | Use strength [SN] to capture opportunity [ON]: [action] |
| S+T | Use strength [SN] to defend against threat [TN]: [action] |
| W+O | Address weakness [WN] to unlock opportunity [ON]: [action] |
| W+T | Mitigate weakness [WN] to reduce threat [TN]: [action] |

### Verdict
[Overall recommendation with confidence level]
```

## Technology Evaluation Example

```markdown
## SWOT: Adopting Prisma ORM for TTNDD_Ops

### Strengths
- [S1] Type-safe queries with auto-generated client — Evidence: zero runtime type errors in tests
- [S2] Excellent migration system — Evidence: 47 migrations managed cleanly
- [S3] Strong community + documentation — Evidence: 30K+ GitHub stars, daily updates

### Weaknesses
- [W1] Version drift between Prisma 5/7 causes breaking changes — Impact: HIGH
- [W2] directUrl conflicts in serverless environments — Impact: MEDIUM
- [W3] Cold start penalty with large schemas — Impact: LOW

### Opportunities
- [O1] Prisma Accelerate for edge caching — Timeline: Q2 2026
- [O2] Prisma Pulse for real-time subscriptions — Timeline: Available now

### Threats
- [T1] Drizzle ORM gaining mindshare, may fragment ecosystem — Likelihood: MEDIUM
- [T2] Prisma pricing changes for cloud features — Likelihood: LOW

### Strategic Actions
| Leverage | Action |
|----------|--------|
| S1+O1 | Leverage type safety with Accelerate edge caching |
| S2+T1 | Migration system is a lock-in advantage vs Drizzle |
| W1+T1 | Pin Prisma version strictly, monitor Drizzle maturity |
| W2+O1 | Accelerate may solve directUrl issues |

### Verdict
ADOPT with version pinning. Watch Drizzle for future evaluation. Confidence: 0.8
```

## Weighted SWOT Variant

For critical decisions, add weights:

```markdown
| Factor | Type | Weight (1-5) | Score (-5 to +5) | Weighted |
|--------|------|-------------|-------------------|----------|
| Type safety | S | 5 | +4 | +20 |
| Migration system | S | 4 | +3 | +12 |
| Version drift | W | 4 | -3 | -12 |
| Cold starts | W | 2 | -2 | -4 |
| Edge caching | O | 3 | +3 | +9 |
| Ecosystem risk | T | 3 | -2 | -6 |
| **TOTAL** | | | | **+19** |
```

Positive total → favorable. Negative → unfavorable. Magnitude indicates strength.

## Integration with UAIC

### Agent Routing
- Primary: Any agent making technology decisions
- Common: `product-owner` (strategy), `code-archaeologist` (migration), `project-planner` (planning)

### GEMINI.md Reference
- §5.1: SWOT for "trước khi plan task mới, đánh giá tool/library"
- Routing Rule: Risk ≥ MEDIUM → BẮT BUỘC dùng ≥1 reasoning pattern trước dispatch

### Write-Back
- Results stored in `decisionLog.md` if leads to architecture decision
- Tags for Neural Memory: `["swot", "<subject>", "tech-eval"]`

## Anti-Patterns

- ❌ Only listing strengths (confirmation bias)
- ❌ Vague items without evidence ("it's popular")
- ❌ Missing the strategic actions section (SWOT without action is useless)
- ❌ Not distinguishing internal vs external factors
- ❌ Doing SWOT without a specific decision context
