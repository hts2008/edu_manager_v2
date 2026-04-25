---
name: Regression Checker
description: Regression testing: detecting regressions, test selection, bisection
---

# Regression Checker

## Regression Detection
- Run full test suite before merge
- Compare test results with baseline
- Flag any newly failing tests as potential regressions

## Test Selection
- Changed files: run tests for modified modules
- Dependency graph: run tests for dependent modules
- Risk-based: always run critical path tests

## Bisection
- git bisect to find exact commit introducing regression
- Automated bisect with test script

## Prevention
- Never delete tests without replacement
- Snapshot tests for UI stability
- Contract tests for API stability
