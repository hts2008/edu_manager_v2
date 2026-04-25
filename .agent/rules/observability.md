---
name: observability
description: "Observability rules — structured logging, metrics, tracing, health checks"
version: "4.0"
enforcement: mandatory
human_override: "User can override with explicit justification documented in decisionLog.md"
---

# Rule: observability.Groups[2].Value.ToUpper()bservability

## Purpose
Observability rules — structured logging, metrics, tracing, health checks.

## Enforcement
This rule is **mandatory**. Violations trigger quality gate failure.

## Human Override
The user may override this rule with explicit justification. The override must be:
1. Documented in `memory/memory-bank/decisionLog.md`
2. Scoped (not blanket exemption)
3. Time-bounded if temporary

## Rules

### R1: [Primary Rule]
**Requirement**: Follow the core principle of observability.
**Rationale**: Ensures consistency, maintainability, and quality.
**Verification**: Automated lint/check where possible, code review otherwise.

### R2: [Secondary Rule]
**Requirement**: Apply best practices specific to this domain.
**Rationale**: Prevents common mistakes and anti-patterns.
**Verification**: Quality gate check.

### R3: [Edge Case Rule]
**Requirement**: Handle edge cases and exceptions appropriately.
**Rationale**: Edge cases cause production issues if not addressed.
**Verification**: Test coverage for edge cases.

## Anti-Patterns
- Ignoring this rule to save time
- Partial compliance (following some rules but not others)
- Overriding without documentation

## Related
- Quality gates: `manifests/quality-gates.yaml`
- Policies: `policies/` (enforcement mechanisms)
- Skills: `skills/` (how to comply)