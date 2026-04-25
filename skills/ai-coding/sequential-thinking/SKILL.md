---
name: Sequential Thinking
description: Multi-step complex reasoning with self-reflection checkpoints for architecture reviews, complex debugging, and multi-file refactors
---

# Sequential Thinking

> Structured, step-by-step reasoning for problems too complex for single-pass analysis.

## When to Use

- Architecture reviews with multiple interacting components
- Complex debugging spanning multiple files/services
- Multi-file refactors with dependency chains
- Design decisions with cascading implications
- Risk assessment for large-scale changes

## Core Protocol: Think → Check → Adjust

### Phase 1: Decompose

Break the problem into sequential steps. Each step has:
- **Input**: What information this step needs
- **Process**: What analysis/action happens
- **Output**: What this step produces
- **Checkpoint**: Self-verification before proceeding

```markdown
## Sequential Analysis: [Problem Title]

### Step 1: [Name]
- **Input**: [Required information]
- **Process**: [What to analyze/do]
- **Output**: [What this produces]
- **Checkpoint**: [How to verify correctness before moving on]
- **Result**: [Actual finding]
- **Confidence**: [HIGH/MEDIUM/LOW]
```

### Phase 2: Self-Reflection Checkpoints

After every 2-3 steps, STOP and ask:

```markdown
## Reflection Point [N]
1. **Assumption audit**: What am I assuming? Is each assumption verified?
2. **Logic gaps**: Did I skip any logical steps?
3. **Alternative paths**: What approach haven't I considered?
4. **Confidence calibration**: 
   - Before reflection: [X%]
   - After reflection: [Y%]
   - Gap > 15%? → RE-ANALYZE
5. **Scope check**: Am I still solving the right problem?
```

### Phase 3: Synthesize

After all steps complete:

```markdown
## Synthesis
- **Conclusion**: [Final answer/recommendation]
- **Evidence chain**: Step [N] → Step [M] → Step [P] → Conclusion
- **Confidence**: [Overall confidence with justification]
- **Risks**: [What could invalidate this conclusion]
- **Next actions**: [Concrete steps]
```

## Templates by Use Case

### Architecture Review

```markdown
## Architecture Review: [Component/System]

### Step 1: Scope Mapping
- Identify all affected components
- Map dependencies (upstream + downstream)
- Checkpoint: dependency graph matches reality

### Step 2: Interface Analysis
- Review public APIs, data contracts, shared state
- Identify breaking vs non-breaking changes
- Checkpoint: all interfaces cataloged

### Step 3: Data Flow Analysis
- Trace data from source to sink
- Identify transformations, validations, side effects
- Checkpoint: no unaccounted data paths

### Step 4: Failure Mode Analysis
- What fails if component X goes down?
- What fails if data format changes?
- What fails under load?
- Checkpoint: failure scenarios are realistic

### Reflection Point
[Run self-reflection protocol]

### Step 5: Risk Assessment
- Rank risks by likelihood × impact
- Identify mitigation strategies
- Checkpoint: risk register is actionable

### Step 6: Recommendation
- Synthesize findings into decision
- Document trade-offs explicitly
```

### Complex Debugging

```markdown
## Debug Investigation: [Bug Title]

### Step 1: Reproduce
- Define exact reproduction steps
- Identify minimum reproduction case
- Checkpoint: bug consistently reproducible

### Step 2: Symptoms Catalog
- What's wrong? (error messages, unexpected behavior)
- When did it start? (commit, deploy, config change)
- What works? (identify boundaries of the problem)
- Checkpoint: symptoms are comprehensive

### Step 3: Hypothesis Generation
- List possible causes ranked by likelihood
- For each, define what evidence would confirm/deny
- Checkpoint: hypotheses are falsifiable

### Reflection Point
[Run self-reflection protocol]

### Step 4: Evidence Gathering
- Run experiments for top hypotheses
- Record results systematically
- Checkpoint: evidence is conclusive

### Step 5: Root Cause Confirmation
- Apply 5 Whys to confirmed cause
- Verify fix addresses root cause
- Checkpoint: fix is at right abstraction level

### Step 6: Fix + Prevention
- Implement fix
- Add test covering this case
- Document in error-catalog
- Checkpoint: regression test passes
```

### Multi-File Refactor

```markdown
## Refactor Plan: [Objective]

### Step 1: Impact Mapping
- Use `get_blast_radius` for each symbol being changed
- Map all call sites and dependencies
- Checkpoint: no orphaned references

### Step 2: Safety Net
- Verify existing test coverage
- Add missing tests BEFORE refactoring
- Checkpoint: all affected code paths covered

### Step 3: Dependency Order
- Sort changes by dependency order (leaves first)
- Identify parallel-safe vs serial-required changes
- Checkpoint: order prevents broken intermediate states

### Reflection Point
[Run self-reflection protocol]

### Step 4: Incremental Execution
- Apply changes one file at a time
- Run tests after EACH file change
- Checkpoint: tests pass at each step

### Step 5: Integration Verification
- Run full test suite
- Verify no type errors
- Check for dead code left behind
- Checkpoint: clean build + all tests pass
```

## Integration with UAIC

### Agent Routing
- Primary: Any agent handling MEDIUM+ risk tasks
- Mandatory for `database-architect`, `security-auditor` high-risk decisions

### GEMINI.md Reference
- §5.1: Sequential Thinking for architecture reviews, complex debugging, multi-file refactors
- §8.1: Mandatory Reflection Protocol (HIGH risk analysis)

### Context+ Integration
- `get_blast_radius` during impact mapping steps
- `semantic_code_search` during scope identification
- `get_context_tree` for architectural overview

### Quality Gate
- HIGH risk tasks MUST include ≥1 Reflection Point
- Reflection gap > 15% → mandatory re-analysis
- All steps must have documented checkpoints

## Anti-Patterns

- ❌ Skipping reflection points under time pressure
- ❌ Proceeding despite LOW confidence without re-analysis
- ❌ Not documenting dead-end reasoning paths
- ❌ Single-pass analysis for complex problems
- ❌ Ignoring confidence calibration gaps
- ❌ Treating sequential thinking as optional for hard problems
