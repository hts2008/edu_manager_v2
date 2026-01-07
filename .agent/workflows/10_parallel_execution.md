---
description: Parallel execution of independent tasks using multiple agents
---

# ⚡ PARALLEL EXECUTION WORKFLOW
<!-- VI: Workflow thực thi song song với nhiều agents -->

> **Core Commands**: `/plan:parallel`, `/code:parallel`, `/fix:parallel`

---

## 🚀 CONCEPT

Execute independent tasks simultaneously with multiple agents for faster completion.

```
TRADITIONAL (Serial):
Task A → Task B → Task C → Task D
Time: 4x

PARALLEL:
Task A ─┐
Task B ─┼─→ Merge → Done
Task C ─┤
Task D ─┘
Time: 1x + merge
```

---

## 📋 PARALLEL PLANNING

### /plan:parallel

```
FUNCTION create_parallel_plan(feature):
    # Step 1: Break down into phases
    phases = DECOMPOSE(feature)
    
    # Step 2: Build dependency graph
    graph = BUILD_DEPENDENCY_GRAPH(phases):
        - Which phases can run in parallel?
        - Which phases depend on others?
        - What are the merge points?
    
    # Step 3: Create file ownership matrix
    ownership = ASSIGN_FILES(phases):
        - Agent A owns: src/auth/*
        - Agent B owns: src/api/*
        - Agent C owns: tests/*
        (No overlap allowed)
    
    # Step 4: Generate parallel plan
    plan = {
        phases: [
            {
                parallel: [
                    { agent: "A", files: [...], tasks: [...] },
                    { agent: "B", files: [...], tasks: [...] }
                ]
            },
            {
                sequential: { merge: true }
            }
        ]
    }
    
    RETURN plan
```

---

## 🔄 PARALLEL EXECUTION

### /code:parallel

```
FUNCTION execute_parallel(plan):
    FOR each phase IN plan.phases:
        IF phase.type == "parallel":
            # Spawn multiple agents
            agents = []
            FOR each task IN phase.parallel:
                agent = SPAWN_AGENT(task.agent_type)
                agent.files = task.files  # Strict ownership
                agent.tasks = task.tasks
                agents.append(agent)
            
            # Execute in parallel
            results = AWAIT_ALL(agents)
            
            # Merge results
            MERGE_BRANCHES(results)
        
        ELSE IF phase.type == "sequential":
            EXECUTE_SERIAL(phase)
```

---

## 📊 FILE OWNERSHIP MATRIX

```markdown
| File/Directory | Agent A | Agent B | Agent C |
|----------------|---------|---------|---------|
| src/auth/*     | ✅ Own  | ❌      | ❌      |
| src/api/*      | ❌      | ✅ Own  | ❌      |
| src/utils/*    | 🔄 Share| 🔄 Share| ❌      |
| tests/*        | ❌      | ❌      | ✅ Own  |

Legend:
✅ Own = Exclusive access
❌ = No access
🔄 Share = Read-only, coordinate changes
```

---

## ⚠️ CONFLICT RESOLUTION

```yaml
rules:
  - NO overlapping file ownership
  - SHARED files require coordination
  - MERGE conflicts trigger review
  - ROLLBACK on critical failures

on_conflict:
  1. Pause parallel execution
  2. Identify conflicting changes
  3. Prioritize by dependency order
  4. Resolve and continue
```

---

## 🔧 COMMANDS

```
/plan:parallel [feature]     # Create parallel-executable plan
/code:parallel [plan.md]     # Execute plan with parallel agents
/fix:parallel [issues]       # Fix multiple issues in parallel
```

---

## 📈 PERFORMANCE GAINS

| Feature Complexity | Serial Time | Parallel Time | Speedup |
|-------------------|-------------|---------------|---------|
| Simple (2 parts)  | 2x          | 1.2x          | 1.7x    |
| Medium (4 parts)  | 4x          | 1.5x          | 2.7x    |
| Complex (8 parts) | 8x          | 2x            | 4x      |

---

**Version**: 1.0
**Reference**: ClaudeKit Parallel Execution
