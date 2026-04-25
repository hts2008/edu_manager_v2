---
name: Decision Log Update
description: Recording architectural decisions: ADR format, rationale, alternatives
---

# Decision Log Update

## When To Log
- Architecture pattern chosen
- Technology or library selected
- Convention established
- Trade-off explicitly made
- Previous decision overridden

## ADR Format
- ID: DEC-NNN (sequential)
- Date: ISO format
- Decision: one sentence summary
- Context: what problem prompted this
- Rationale: why this option over alternatives
- Alternatives: what was considered and rejected
- Consequences: positive and negative impacts

## Quality Criteria
- Decision must be actionable (not vague)
- Rationale must reference evidence (benchmark, doc, test)
- Alternatives must include at least one other option
- Consequences must be honest about trade-offs

## Anti-Patterns
- Logging trivial decisions (variable naming in one file)
- Missing rationale (decided to use X - no why)
- Not updating when decision is reversed
