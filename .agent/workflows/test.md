---
description: Testing — strategy, write tests, run, report coverage
---
// turbo-all

## Steps

1. Run current coverage:
   ```
   npm test -- --coverage
   ```

2. Identify gaps: untested files, critical paths without tests, low-coverage modules.

3. Prioritize: new code > critical paths (auth, payment) > bug-prone areas > edge cases.

4. Write tests following pyramid: unit (70%) > integration (20%) > E2E (10%).

5. Use naming: `should [verb] when [condition]`.

6. Run full suite. Capture results and coverage report.

7. Fix any new flaky tests immediately — don't merge flaky tests.