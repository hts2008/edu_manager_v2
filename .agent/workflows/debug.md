---
description: Bug debugging — reproduce, isolate, root-cause, fix, verify
---
// turbo-all

## Steps

1. Read error message / bug report. Extract: expected behavior, actual behavior, reproduction steps.

2. Check `memory/brain/error-catalog.md` — is this a known error pattern?

3. Reproduce the bug locally. If can't reproduce after 3 attempts → ask for more info.

4. Isolate: binary search approach — comment out half the code, does bug persist?

5. Check `git log --oneline -20` — any recent changes near the affected code?

6. Root cause: read stack trace bottom-up. Categorize: logic | state | timing | data | config.

7. Write regression test that fails with current code (proves the bug).

8. Apply minimal fix — change only what's necessary.

9. Run regression test (must pass) + full suite (no regressions):
   ```
   npm test
   ```

10. Add error pattern to `memory/brain/error-catalog.md`.

11. Update KANBAN.md and `memory/memory-bank/progress.md`.

## Context+ Enhancement

When Context+ is available:
- **Step 4**: Use `semantic_code_search("error related to [symptom]")` to trace root cause semantically
- **Step 6**: Use `get_blast_radius(buggy_function)` to understand the scope of affected code paths
- **Step 8**: For non-trivial fixes, use `propose_commit` to create restore point before applying fix
- **Post-fix**: `run_static_analysis` to verify fix hasn't introduced new issues