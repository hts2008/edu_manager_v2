---
description: Safe refactoring — analyze, safety net, incremental changes, verify
---
// turbo-all

## Steps

1. Identify refactoring target: what smell? (long function, large class, duplication, coupling)

2. Measure: lines, complexity, test coverage on affected code.

3. If test coverage < 80% on target code → write characterization tests first.

4. Run all tests to establish green baseline:
   ```
   npm test
   ```

5. Make ONE refactoring per commit: extract, rename, move, or delete.

6. Run tests after EACH change. If any fail → revert immediately.

7. Repeat steps 5-6 until refactoring complete.

8. Before/after: lines, complexity, coverage. Document improvement.

## Context+ Enhancement (MANDATORY for refactoring)

When Context+ is available, these are **required** additions:
- **Step 1**: `get_context_tree` → understand module structure before planning extraction
- **Step 5**: `get_blast_radius(target)` → **MANDATORY before every extract/rename/move**
- **Step 5**: `propose_commit(change)` → guarded write with restore point for each atomic refactoring
- **Step 6**: `run_static_analysis` → verify no import breaks after each change
- **Rollback**: Use `undo_change` if tests fail instead of manual revert

See `rules/mcp-contextplus.md` Rule 1 — blast radius before refactor is non-negotiable.