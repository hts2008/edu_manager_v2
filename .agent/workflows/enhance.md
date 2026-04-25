---
description: Enhancement — profile, optimize, benchmark existing features
---
// turbo-all

## Steps

1. Measure baseline: Lighthouse score, bundle size, test coverage, API response times.

2. Profile: Chrome DevTools (frontend), `EXPLAIN ANALYZE` (database), load testing (backend).

3. Identify top 3 bottlenecks: largest impact × lowest effort.

4. Implement one improvement at a time. Run tests after each change.

5. Re-measure same metrics. Create before/after comparison.

6. Only claim "improved" with numerical data as evidence.

7. Update `memory/memory-bank/progress.md` with performance results.